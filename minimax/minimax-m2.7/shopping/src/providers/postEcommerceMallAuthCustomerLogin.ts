import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthCustomerLogin(props: {
  ip: string;
  body: IEcommerceMallCustomer.ILogin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      profile: {
        select: {
          id: true,
          display_name: true,
          phone: true,
          created_at: true,
          updated_at: true,
          customer: {
            select: {
              id: true,
              email: true,
              created_at: true,
              deleted_at: true,
              profile: { select: { display_name: true } },
            },
          },
        },
      },
      wishlist: {
        select: {
          id: true,
          created_at: true,
          wishlistItems: {
            select: {
              id: true,
              created_at: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  base_price: true,
                  created_at: true,
                  seller: {
                    select: {
                      id: true,
                      email: true,
                      approval_status: true,
                      created_at: true,
                      profile: {
                        select: { id: true, name: true, description: true },
                      },
                    },
                  },
                  category: { select: { id: true, name: true } },
                  productImages: {
                    select: { id: true, image_url: true, display_order: true },
                    orderBy: { display_order: "asc" },
                    take: 1,
                  },
                  variants: {
                    select: {
                      id: true,
                      sku_code: true,
                      price: true,
                      quantity: true,
                    },
                  },
                  reviews: {
                    select: { id: true, rating: true },
                    where: { deleted_at: null },
                  },
                  wishlistItems: { select: { id: true } },
                },
              },
            },
          },
        },
      },
      cart: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          customer: {
            select: {
              id: true,
              email: true,
              created_at: true,
              deleted_at: true,
              profile: { select: { display_name: true } },
            },
          },
          cartItems: {
            select: {
              id: true,
              quantity: true,
              created_at: true,
              updated_at: true,
              productVariant: {
                select: {
                  id: true,
                  sku_code: true,
                  price: true,
                  quantity: true,
                  created_at: true,
                  updated_at: true,
                  optionValues: {
                    select: {
                      id: true,
                      key: true,
                      value: true,
                      created_at: true,
                      updated_at: true,
                      productVariant: {
                        select: {
                          id: true,
                          sku_code: true,
                          price: true,
                          quantity: true,
                          created_at: true,
                          updated_at: true,
                          optionValues: { select: { id: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_mall_customer_sessions.create(
    {
      data: {
        id: v4(),
        ecommerce_mall_customer_id: customer.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        access_token: "",
        refresh_token: "",
        created_at: new Date(),
        updated_at: new Date(),
        expired_at: accessExpires,
      },
    },
  );
  const accessToken = jwt.sign(
    {
      type: "customer" as const,
      id: customer.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "customer" as const,
      id: customer.id,
      session_id: session.id,
      tokenType: "refresh" as const,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  if (!customer.profile) {
    throw new HttpException("Customer profile not found", 404);
  }
  const customerSummary: IEcommerceMallCustomer.ISummary = {
    id: customer.profile.customer.id,
    email: customer.profile.customer.email,
    created_at: customer.profile.customer.created_at.toISOString(),
    display_name: customer.profile.customer.profile?.display_name ?? null,
    status:
      customer.profile.customer.deleted_at === null ? "active" : "deleted",
  };
  const profile: IEcommerceMallCustomerProfile = {
    id: customer.profile.id,
    display_name: customer.profile.display_name,
    phone: customer.profile.phone,
    customer: customerSummary,
    created_at: customer.profile.created_at.toISOString(),
    updated_at: customer.profile.updated_at.toISOString(),
  };
  const cartData = customer.cart;
  const stubCartSummary: IEcommerceMallCustomer.ISummary = {
    id: customer.id,
    email: customer.email,
    created_at: customer.created_at.toISOString(),
    display_name: null,
    status: "active",
  };
  const stubCart: IEcommerceMallCart = {
    id: cartData?.id ?? "",
    customer: stubCartSummary,
    cart_items: [],
    created_at: (cartData?.created_at ?? new Date()).toISOString(),
    updated_at: (cartData?.updated_at ?? new Date()).toISOString(),
  };
  const cartItems: IEcommerceMallCartItem[] = (cartData?.cartItems ?? []).map(
    (item) => {
      const subtotal = item.quantity * (item.productVariant.price ?? 0);
      const optionValues: IEcommerceMallProductVariantOptionValue[] =
        item.productVariant.optionValues.map((ov) => {
          const innerOptionValues: IEcommerceMallProductVariantOptionValue[] =
            ov.productVariant.optionValues.map(
              (iov) =>
                ({
                  id: iov.id,
                  key: "",
                  value: "",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  variant: {
                    id: ov.productVariant.id,
                    sku_code: ov.productVariant.sku_code,
                    price: ov.productVariant.price,
                    quantity: ov.productVariant.quantity,
                    created_at: ov.productVariant.created_at.toISOString(),
                    optionValues: [],
                  } satisfies IEcommerceMallProductVariant.ISummary,
                }) satisfies IEcommerceMallProductVariantOptionValue,
            );
          return {
            id: ov.id,
            key: ov.key,
            value: ov.value,
            created_at: ov.created_at.toISOString(),
            updated_at: ov.updated_at.toISOString(),
            variant: {
              id: ov.productVariant.id,
              sku_code: ov.productVariant.sku_code,
              price: ov.productVariant.price,
              quantity: ov.productVariant.quantity,
              created_at: ov.productVariant.created_at.toISOString(),
              optionValues: innerOptionValues,
            } satisfies IEcommerceMallProductVariant.ISummary,
          } satisfies IEcommerceMallProductVariantOptionValue;
        });
      const productVariant: IEcommerceMallProductVariant.ISummary = {
        id: item.productVariant.id,
        sku_code: item.productVariant.sku_code,
        price: item.productVariant.price,
        quantity: item.productVariant.quantity,
        created_at: item.productVariant.created_at.toISOString(),
        optionValues: optionValues,
      };
      return {
        id: item.id,
        quantity: item.quantity,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
        subtotal: subtotal,
        cart: stubCart,
        product_variant: productVariant,
      } satisfies IEcommerceMallCartItem;
    },
  );
  const wishlistItems: IEcommerceMallWishlistItem[] = (
    customer.wishlist?.wishlistItems ?? []
  ).map((item) => ({
    id: item.id,
    created_at: item.created_at.toISOString(),
    product: {
      id: item.product.id,
      name: item.product.name,
      min_price: item.product.base_price,
      max_price: item.product.base_price,
      primary_image_url: item.product.productImages[0]?.image_url ?? "",
      seller_name: item.product.seller.profile?.name ?? "",
      average_rating: 0,
      reviews_count: item.product.reviews.length,
      created_at: item.product.created_at.toISOString(),
    },
  }));
  const firstCartItem =
    cartItems.length > 0
      ? cartItems[0]
      : ({
          id: "",
          quantity: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          subtotal: 0,
          cart: stubCart,
          product_variant: {
            id: "",
            sku_code: "",
            price: null,
            quantity: 0,
            created_at: new Date().toISOString(),
            optionValues: [],
          } satisfies IEcommerceMallProductVariant.ISummary,
        } satisfies IEcommerceMallCartItem);
  const firstWishlistItem =
    wishlistItems.length > 0
      ? wishlistItems[0]
      : ({
          id: customer.wishlist?.id ?? "",
          created_at: (
            customer.wishlist?.created_at ?? new Date()
          ).toISOString(),
          product: {
            id: "",
            name: "",
            min_price: 0,
            max_price: 0,
            primary_image_url: "",
            seller_name: "",
            average_rating: 0,
            reviews_count: 0,
            created_at: new Date().toISOString(),
          },
        } satisfies IEcommerceMallWishlistItem);
  return {
    id: customer.id,
    email: customer.email,
    created_at: customer.created_at.toISOString(),
    updated_at: customer.updated_at.toISOString(),
    deleted_at: customer.deleted_at?.toISOString() ?? null,
    profile,
    shippingAddresses: [],
    orders: [],
    reviews: [],
    cancellationRequests: [],
    refundRequests: [],
    wishlist: firstWishlistItem,
    cart: firstCartItem,
    token,
  };
}
