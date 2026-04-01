import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShoppingCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerCarts(props: {
  customer: CustomerPayload;
  body: IMallPlatformShoppingCart.IRequest;
}): Promise<IPageIMallPlatformShoppingCart.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 1;
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    const shoppingCart =
      await prisma.mall_platform_shopping_carts.findFirstOrThrow({
        where: {
          mall_platform_customer_id: props.customer.id,
          deleted_at: null,
        },
        select: {
          id: true,
          mall_platform_customer_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    const cartItems = await prisma.mall_platform_cart_items.findMany({
      where: {
        mall_platform_shopping_cart_id: shoppingCart.id,
        deleted_at: null,
      },
      orderBy: {
        created_at: "asc",
      },
      select: {
        id: true,
        quantity: true,
        availability_state: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        mall_platform_shopping_cart_id: true,
        mall_platform_product_variant_id: true,
        productVariant: {
          select: {
            id: true,
            sku_code: true,
            option_values: true,
            price_override: true,
            is_active: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                base_price: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                sellerAccount: {
                  select: {
                    id: true,
                    email: true,
                    approval_status: true,
                    rejection_reason: true,
                    suspended_at: true,
                    deleted_at: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
                category: {
                  select: {
                    id: true,
                    parentCategory: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                        parentCategory: {
                          select: {
                            id: true,
                            name: true,
                            description: true,
                            created_at: true,
                            updated_at: true,
                            deleted_at: true,
                          },
                        },
                      },
                    },
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const normalizedItems = cartItems.map((item) => ({
      ...item,
      availability_state:
        item.productVariant.is_active && item.productVariant.deleted_at === null
          ? "available"
          : "unavailable",
    }));
    await prisma.mall_platform_cart_items.updateMany({
      where: {
        id: {
          in: normalizedItems.map((item) => item.id),
        },
      },
      data: {
        updated_at: new Date(),
      },
    });
    await prisma.mall_platform_shopping_carts.update({
      where: {
        id: shoppingCart.id,
      },
      data: {
        updated_at: new Date(),
      },
    });
    return {
      shoppingCart,
      cartItems: normalizedItems,
    };
  });
  const data = [
    {
      id: result.shoppingCart.id,
      customer: await MyGlobal.prisma.mall_platform_customers
        .findUniqueOrThrow({
          where: { id: props.customer.id },
          select: {
            id: true,
            email: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        })
        .then((customer) => ({
          id: customer.id,
          email: customer.email,
          status: customer.status,
          created_at: customer.created_at.toISOString(),
          updated_at: customer.updated_at.toISOString(),
          deleted_at: customer.deleted_at?.toISOString() ?? null,
        })),
      cartItems: await ArrayUtil.asyncMap(result.cartItems, async (item) => ({
        id: item.id,
        shoppingCart: {
          id: result.shoppingCart.id,
          customer: {
            id: props.customer.id,
            email: (
              await MyGlobal.prisma.mall_platform_customers.findUniqueOrThrow({
                where: { id: props.customer.id },
                select: {
                  email: true,
                },
              })
            ).email,
            status: "",
            created_at: "",
            updated_at: "",
            deleted_at: null,
          },
          cartItems: [],
          totalPrice: 0,
          createdAt: result.shoppingCart.created_at.toISOString(),
          updatedAt: result.shoppingCart.updated_at.toISOString(),
          deletedAt: result.shoppingCart.deleted_at?.toISOString() ?? null,
        },
        productVariant: {
          id: item.productVariant.id,
          skuCode: item.productVariant.sku_code,
          optionValues: item.productVariant.option_values,
          priceOverride: item.productVariant.price_override,
          isActive: item.productVariant.is_active,
          product: {
            id: item.productVariant.product.id,
            name: item.productVariant.product.name,
            description: item.productVariant.product.description,
            basePrice: item.productVariant.product.base_price,
            sellerAccount: {
              id: item.productVariant.product.sellerAccount.id,
              email: item.productVariant.product.sellerAccount.email,
              approvalStatus:
                item.productVariant.product.sellerAccount.approval_status,
              rejectionReason:
                item.productVariant.product.sellerAccount.rejection_reason,
              suspendedAt:
                item.productVariant.product.sellerAccount.suspended_at?.toISOString() ??
                null,
              deletedAt:
                item.productVariant.product.sellerAccount.deleted_at?.toISOString() ??
                null,
              createdAt:
                item.productVariant.product.sellerAccount.created_at.toISOString(),
              updatedAt:
                item.productVariant.product.sellerAccount.updated_at.toISOString(),
            },
            category: item.productVariant.product.category
              ? {
                  id: item.productVariant.product.category.id,
                  parentCategory: item.productVariant.product.category
                    .parentCategory
                    ? {
                        id: item.productVariant.product.category.parentCategory
                          .id,
                        parentCategory: null,
                        name: item.productVariant.product.category
                          .parentCategory.name,
                        description:
                          item.productVariant.product.category.parentCategory
                            .description,
                        createdAt:
                          item.productVariant.product.category.parentCategory.created_at.toISOString(),
                        updatedAt:
                          item.productVariant.product.category.parentCategory.updated_at.toISOString(),
                        deletedAt:
                          item.productVariant.product.category.parentCategory.deleted_at?.toISOString() ??
                          null,
                      }
                    : null,
                  name: item.productVariant.product.category.name,
                  description: item.productVariant.product.category.description,
                  createdAt:
                    item.productVariant.product.category.created_at.toISOString(),
                  updatedAt:
                    item.productVariant.product.category.updated_at.toISOString(),
                  deletedAt:
                    item.productVariant.product.category.deleted_at?.toISOString() ??
                    null,
                }
              : null,
            createdAt: item.productVariant.product.created_at.toISOString(),
            updatedAt: item.productVariant.product.updated_at.toISOString(),
            deletedAt:
              item.productVariant.product.deleted_at?.toISOString() ?? null,
          },
          createdAt: item.productVariant.created_at.toISOString(),
          updatedAt: item.productVariant.updated_at.toISOString(),
          deletedAt: item.productVariant.deleted_at?.toISOString() ?? null,
        },
        quantity: item.quantity,
        availabilityState: item.availability_state,
        createdAt: item.created_at.toISOString(),
        updatedAt: item.updated_at.toISOString(),
        deletedAt: item.deleted_at?.toISOString() ?? null,
      })),
      totalPrice: result.cartItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      createdAt: result.shoppingCart.created_at.toISOString(),
      updatedAt: result.shoppingCart.updated_at.toISOString(),
      deletedAt: result.shoppingCart.deleted_at?.toISOString() ?? null,
    },
  ];
  return {
    pagination: {
      current: page,
      limit,
      records: data.length,
      pages: Math.ceil(data.length / limit),
    },
    data,
  };
}
