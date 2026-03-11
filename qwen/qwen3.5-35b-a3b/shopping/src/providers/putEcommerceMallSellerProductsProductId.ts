import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductTransformer } from "../transformers/EcommerceMallProductTransformer";
import { EcommerceMallProductVariantTransformer } from "../transformers/EcommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IUpdate;
}): Promise<IEcommerceMallProduct> {
  // Step 1: Verify product exists and is not soft-deleted
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        seller_id: true,
        category_id: true,
        name: true,
        description: true,
        base_price: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        _count: {
          select: {
            orderItems: true,
            wishlistEntries: true,
            reviews: true,
          },
        },
        seller: {
          select: {
            email: true,
            id: true,
            approval_status: true,
            rejection_reason: true,
            is_suspended: true,
            is_banned: true,
            created_at: true,
            updated_at: true,
          },
        },
        category: {
          select: {
            name: true,
            id: true,
            deleted_at: true,
            description: true,
            parent_category_id: true,
            is_leaf: true,
            created_at: true,
            updated_at: true,
          },
        },
        variants: EcommerceMallProductVariantTransformer.select(),
        images: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            image_url: true,
            display_order: true,
            product: EcommerceMallProductAtSummaryTransformer.select(),
          } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs,
        },
        snapshots: {
          select: {
            id: true,
            created_at: true,
            name: true,
            base_price: true,
            seller: {
              select: {
                email: true,
                id: true,
                approval_status: true,
                rejection_reason: true,
                is_suspended: true,
                is_banned: true,
                created_at: true,
                updated_at: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                base_price: true,
                is_active: true,
                seller: {
                  select: {
                    email: true,
                    id: true,
                    approval_status: true,
                    rejection_reason: true,
                    is_suspended: true,
                    is_banned: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    parent_category_id: true,
                    is_leaf: true,
                  },
                },
              },
            },
            is_active: true,
            description: true,
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                parent_category_id: true,
                is_leaf: true,
              },
            },
          },
        },
        reviews: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            rating: true,
            deleted_at: true,
            text_content: true,
            is_active: true,
            customer: {
              select: {
                id: true,
                email: true,
                is_banned: true,
                created_at: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                base_price: true,
                is_active: true,
                seller: {
                  select: {
                    email: true,
                    id: true,
                    approval_status: true,
                    rejection_reason: true,
                    is_suspended: true,
                    is_banned: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    parent_category_id: true,
                    is_leaf: true,
                  },
                },
              },
            },
          },
        },
        orderItems: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            quantity: true,
            unit_price: true,
            item_status: true,
            product_snapshot: true,
            variant_snapshot: true,
            seller_profile_snapshot: true,
            deleted_at: true,
            ecommerce_mall_order_id: true,
            ecommerce_mall_product_id: true,
            ecommerce_mall_product_variant_id: true,
          },
        },
        wishlistEntries: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            ecommerce_mall_product_id: true,
            ecommerce_mall_customer_id: true,
          },
        },
        variantSnapshots: {
          select: {
            id: true,
            created_at: true,
            stock_quantity: true,
            sku_code: true,
            product_id: true,
            ecommerce_mall_product_variant_id: true,
            option_values: true,
            price_override: true,
            is_active: true,
          },
        },
      },
    });
  // Step 2: Verify seller owns this product
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate category change if provided
  if (props.body.category_id !== undefined) {
    // Verify category exists
    const category = await MyGlobal.prisma.ecommerce_mall_categories.findUnique(
      {
        where: {
          id: props.body.category_id,
          deleted_at: null,
        },
      },
    );
    if (category === null) {
      throw new HttpException("Category not found", 400);
    }
    // Create product snapshot before category change (section 461)
    if (props.body.category_id !== product.category_id) {
      await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          product: {
            connect: { id: props.productId },
          },
          ...(product.category_id !== null && {
            category: {
              connect: { id: product.category_id },
            },
          }),
          seller: {
            connect: { id: props.seller.id },
          },
          name: product.name,
          description: product.description,
          base_price: Number(product.base_price),
          is_active: product.is_active,
          created_at: toISOStringSafe(new Date()),
        },
      });
    }
  }
  // Step 4: Validate base_price is positive if provided
  if (props.body.base_price !== undefined && props.body.base_price <= 0) {
    throw new HttpException("Base price must be positive", 400);
  }
  // Step 5: Update product record
  const updatedProduct = await MyGlobal.prisma.ecommerce_mall_products.update({
    where: {
      id: props.productId,
    },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.base_price !== undefined && {
        base_price: props.body.base_price,
      }),
      ...(props.body.category_id !== undefined && {
        category_id: props.body.category_id,
      }),
      ...(props.body.is_active !== undefined && {
        is_active: props.body.is_active,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      seller_id: true,
      category_id: true,
      name: true,
      description: true,
      base_price: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      _count: {
        select: {
          orderItems: true,
          wishlistEntries: true,
          reviews: true,
        },
      },
      seller: {
        select: {
          email: true,
          id: true,
          approval_status: true,
          rejection_reason: true,
          is_suspended: true,
          is_banned: true,
          created_at: true,
          updated_at: true,
        },
      },
      category: {
        select: {
          name: true,
          id: true,
          deleted_at: true,
          description: true,
          parent_category_id: true,
          is_leaf: true,
          created_at: true,
          updated_at: true,
        },
      },
      variants: EcommerceMallProductVariantTransformer.select(),
      images: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          image_url: true,
          display_order: true,
          product: EcommerceMallProductAtSummaryTransformer.select(),
        } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs,
      },
      snapshots: {
        select: {
          id: true,
          created_at: true,
          name: true,
          base_price: true,
          seller: {
            select: {
              email: true,
              id: true,
              approval_status: true,
              rejection_reason: true,
              is_suspended: true,
              is_banned: true,
              created_at: true,
              updated_at: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              base_price: true,
              is_active: true,
              seller: {
                select: {
                  email: true,
                  id: true,
                  approval_status: true,
                  rejection_reason: true,
                  is_suspended: true,
                  is_banned: true,
                  created_at: true,
                  updated_at: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                  parent_category_id: true,
                  is_leaf: true,
                },
              },
            },
          },
          is_active: true,
          description: true,
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              parent_category_id: true,
              is_leaf: true,
            },
          },
        },
      },
      reviews: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          rating: true,
          deleted_at: true,
          text_content: true,
          is_active: true,
          customer: {
            select: {
              id: true,
              email: true,
              is_banned: true,
              created_at: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              base_price: true,
              is_active: true,
              seller: {
                select: {
                  email: true,
                  id: true,
                  approval_status: true,
                  rejection_reason: true,
                  is_suspended: true,
                  is_banned: true,
                  created_at: true,
                  updated_at: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                  parent_category_id: true,
                  is_leaf: true,
                },
              },
            },
          },
        },
      },
      orderItems: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          quantity: true,
          unit_price: true,
          item_status: true,
          product_snapshot: true,
          variant_snapshot: true,
          seller_profile_snapshot: true,
          deleted_at: true,
          ecommerce_mall_order_id: true,
          ecommerce_mall_product_id: true,
          ecommerce_mall_product_variant_id: true,
        },
      },
      wishlistEntries: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          ecommerce_mall_product_id: true,
          ecommerce_mall_customer_id: true,
        },
      },
      variantSnapshots: {
        select: {
          id: true,
          created_at: true,
          stock_quantity: true,
          sku_code: true,
          product_id: true,
          ecommerce_mall_product_variant_id: true,
          option_values: true,
          price_override: true,
          is_active: true,
        },
      },
    },
  });
  // Step 6: Transform and return complete product
  return await EcommerceMallProductTransformer.transform(updatedProduct);
}
