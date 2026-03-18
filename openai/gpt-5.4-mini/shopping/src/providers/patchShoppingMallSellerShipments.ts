import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  if (
    props.body.shopping_mall_seller_id !== undefined &&
    props.body.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const orderBy: Prisma.shopping_mall_shipmentsOrderByWithRelationInput =
    props.body.sort === undefined || props.body.sort === "-created_at"
      ? { created_at: "desc" }
      : props.body.sort === "created_at"
        ? { created_at: "asc" }
        : props.body.sort === "updated_at"
          ? { updated_at: "asc" }
          : props.body.sort === "-updated_at"
            ? { updated_at: "desc" }
            : props.body.sort === "status"
              ? { status: "asc" }
              : props.body.sort === "-status"
                ? { status: "desc" }
                : props.body.sort === "carrier_name"
                  ? { carrier_name: "asc" }
                  : props.body.sort === "-carrier_name"
                    ? { carrier_name: "desc" }
                    : props.body.sort === "tracking_number"
                      ? { tracking_number: "asc" }
                      : props.body.sort === "-tracking_number"
                        ? { tracking_number: "desc" }
                        : props.body.sort === "shipped_at"
                          ? { shipped_at: "asc" }
                          : props.body.sort === "-shipped_at"
                            ? { shipped_at: "desc" }
                            : props.body.sort === "delivered_at"
                              ? { delivered_at: "asc" }
                              : props.body.sort === "-delivered_at"
                                ? { delivered_at: "desc" }
                                : (() => {
                                    throw new HttpException(
                                      "Unsupported sort field",
                                      400,
                                    );
                                  })();
  const where: Prisma.shopping_mall_shipmentsWhereInput = {
    deleted_at: null,
    shopping_mall_seller_id: props.seller.id,
    ...(props.body.shopping_mall_order_id !== undefined && {
      shopping_mall_order_id: props.body.shopping_mall_order_id,
    }),
    ...(props.body.carrier_name !== undefined && {
      carrier_name: { contains: props.body.carrier_name, mode: "insensitive" },
    }),
    ...(props.body.tracking_number !== undefined && {
      tracking_number: {
        contains: props.body.tracking_number,
        mode: "insensitive",
      },
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.shipped_at_from !== undefined ||
    props.body.shipped_at_to !== undefined
      ? {
          shipped_at: {
            ...(props.body.shipped_at_from !== undefined && {
              gte: props.body.shipped_at_from,
            }),
            ...(props.body.shipped_at_to !== undefined && {
              lte: props.body.shipped_at_to,
            }),
          },
        }
      : {}),
    ...(props.body.delivered_at_from !== undefined ||
    props.body.delivered_at_to !== undefined
      ? {
          delivered_at: {
            ...(props.body.delivered_at_from !== undefined && {
              gte: props.body.delivered_at_from,
            }),
            ...(props.body.delivered_at_to !== undefined && {
              lte: props.body.delivered_at_to,
            }),
          },
        }
      : {}),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: props.body.created_at_to,
            }),
          },
        }
      : {}),
    ...(props.body.updated_at_from !== undefined ||
    props.body.updated_at_to !== undefined
      ? {
          updated_at: {
            ...(props.body.updated_at_from !== undefined && {
              gte: props.body.updated_at_from,
            }),
            ...(props.body.updated_at_to !== undefined && {
              lte: props.body.updated_at_to,
            }),
          },
        }
      : {}),
  };
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where,
    orderBy: [orderBy, { id: "desc" }],
    skip,
    take: limit,
    select: {
      id: true,
      order: {
        select: {
          id: true,
          order_number: true,
          status: true,
          subtotal_amount: true,
          shipping_fee_amount: true,
          discount_amount: true,
          total_amount: true,
          placed_at: true,
          paid_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          customer: {
            select: {
              id: true,
              email: true,
              account_status: true,
              banned_at: true,
              deleted_at: true,
              created_at: true,
              updated_at: true,
            },
          },
          shippingAddress: {
            select: {
              id: true,
              recipient_name: true,
              phone_number: true,
              street_address: true,
              city: true,
              state_province: true,
              postal_code: true,
              country: true,
              is_default: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
      seller: {
        select: {
          id: true,
          email: true,
          approval_status: true,
          rejection_reason: true,
          account_status: true,
          approved_at: true,
          rejected_at: true,
          suspended_at: true,
          banned_at: true,
          last_login_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          sellerProfile: {
            select: {
              id: true,
              shop_name: true,
              shop_description: true,
              logo_image_url: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
      carrier_name: true,
      tracking_number: true,
      status: true,
      shipped_at: true,
      delivered_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const records: number = await MyGlobal.prisma.shopping_mall_shipments.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(data, async (shipment) => {
      const sellerProfile = shipment.seller.sellerProfile;
      return {
        id: shipment.id,
        order: {
          id: shipment.order.id,
          order_number: shipment.order.order_number,
          status: shipment.order.status,
          subtotal_amount: shipment.order.subtotal_amount,
          shipping_fee_amount: shipment.order.shipping_fee_amount,
          discount_amount: shipment.order.discount_amount,
          total_amount: shipment.order.total_amount,
          placed_at: toISOStringSafe(shipment.order.placed_at),
          paid_at:
            shipment.order.paid_at === null
              ? null
              : toISOStringSafe(shipment.order.paid_at),
          created_at: toISOStringSafe(shipment.order.created_at),
          updated_at: toISOStringSafe(shipment.order.updated_at),
          deleted_at:
            shipment.order.deleted_at === null
              ? null
              : toISOStringSafe(shipment.order.deleted_at),
          customer: {
            id: shipment.order.customer.id,
            email: shipment.order.customer.email,
            accountStatus: shipment.order.customer.account_status,
            bannedAt:
              shipment.order.customer.banned_at === null
                ? null
                : toISOStringSafe(shipment.order.customer.banned_at),
            deletedAt:
              shipment.order.customer.deleted_at === null
                ? null
                : toISOStringSafe(shipment.order.customer.deleted_at),
            createdAt: toISOStringSafe(shipment.order.customer.created_at),
            updatedAt: toISOStringSafe(shipment.order.customer.updated_at),
          },
          shippingAddress:
            shipment.order.shippingAddress === null
              ? null
              : {
                  id: shipment.order.shippingAddress.id,
                  customerProfile: {} as IShoppingMallCustomerProfile.ISummary,
                  recipientName: shipment.order.shippingAddress.recipient_name,
                  phoneNumber: shipment.order.shippingAddress.phone_number,
                  streetAddress: shipment.order.shippingAddress.street_address,
                  city: shipment.order.shippingAddress.city,
                  stateProvince: shipment.order.shippingAddress.state_province,
                  postalCode: shipment.order.shippingAddress.postal_code,
                  country: shipment.order.shippingAddress.country,
                  isDefault: shipment.order.shippingAddress.is_default,
                  createdAt: toISOStringSafe(
                    shipment.order.shippingAddress.created_at,
                  ),
                  updatedAt: toISOStringSafe(
                    shipment.order.shippingAddress.updated_at,
                  ),
                  deletedAt:
                    shipment.order.shippingAddress.deleted_at === null
                      ? null
                      : toISOStringSafe(
                          shipment.order.shippingAddress.deleted_at,
                        ),
                },
        },
        seller: {
          id: shipment.seller.id,
          email: shipment.seller.email,
          approvalStatus: shipment.seller.approval_status,
          rejectionReason: shipment.seller.rejection_reason,
          accountStatus: shipment.seller.account_status,
          approvedAt:
            shipment.seller.approved_at === null
              ? null
              : toISOStringSafe(shipment.seller.approved_at),
          rejectedAt:
            shipment.seller.rejected_at === null
              ? null
              : toISOStringSafe(shipment.seller.rejected_at),
          suspendedAt:
            shipment.seller.suspended_at === null
              ? null
              : toISOStringSafe(shipment.seller.suspended_at),
          bannedAt:
            shipment.seller.banned_at === null
              ? null
              : toISOStringSafe(shipment.seller.banned_at),
          lastLoginAt:
            shipment.seller.last_login_at === null
              ? null
              : toISOStringSafe(shipment.seller.last_login_at),
          createdAt: toISOStringSafe(shipment.seller.created_at),
          updatedAt: toISOStringSafe(shipment.seller.updated_at),
          deletedAt:
            shipment.seller.deleted_at === null
              ? null
              : toISOStringSafe(shipment.seller.deleted_at),
          sellerProfile:
            sellerProfile === null
              ? ({
                  id: "00000000-0000-0000-0000-000000000000" as string &
                    tags.Format<"uuid">,
                  seller: {
                    id: shipment.seller.id,
                    email: shipment.seller.email,
                    approvalStatus: shipment.seller.approval_status,
                    rejectionReason: shipment.seller.rejection_reason,
                    accountStatus: shipment.seller.account_status,
                    approvedAt:
                      shipment.seller.approved_at === null
                        ? null
                        : toISOStringSafe(shipment.seller.approved_at),
                    rejectedAt:
                      shipment.seller.rejected_at === null
                        ? null
                        : toISOStringSafe(shipment.seller.rejected_at),
                    suspendedAt:
                      shipment.seller.suspended_at === null
                        ? null
                        : toISOStringSafe(shipment.seller.suspended_at),
                    bannedAt:
                      shipment.seller.banned_at === null
                        ? null
                        : toISOStringSafe(shipment.seller.banned_at),
                    lastLoginAt:
                      shipment.seller.last_login_at === null
                        ? null
                        : toISOStringSafe(shipment.seller.last_login_at),
                    createdAt: toISOStringSafe(shipment.seller.created_at),
                    updatedAt: toISOStringSafe(shipment.seller.updated_at),
                    deletedAt:
                      shipment.seller.deleted_at === null
                        ? null
                        : toISOStringSafe(shipment.seller.deleted_at),
                    sellerProfile: {} as IShoppingMallSellerProfile.ISummary,
                  } as IShoppingMallSeller.ISummary,
                  shopName: "",
                  shopDescription: "",
                  logoImageUrl: "",
                  created_at: new Date(0).toISOString(),
                  updated_at: new Date(0).toISOString(),
                  deleted_at: null,
                } satisfies IShoppingMallSellerProfile.ISummary)
              : {
                  id: sellerProfile.id,
                  seller: {
                    id: shipment.seller.id,
                    email: shipment.seller.email,
                    approvalStatus: shipment.seller.approval_status,
                    rejectionReason: shipment.seller.rejection_reason,
                    accountStatus: shipment.seller.account_status,
                    approvedAt:
                      shipment.seller.approved_at === null
                        ? null
                        : toISOStringSafe(shipment.seller.approved_at),
                    rejectedAt:
                      shipment.seller.rejected_at === null
                        ? null
                        : toISOStringSafe(shipment.seller.rejected_at),
                    suspendedAt:
                      shipment.seller.suspended_at === null
                        ? null
                        : toISOStringSafe(shipment.seller.suspended_at),
                    bannedAt:
                      shipment.seller.banned_at === null
                        ? null
                        : toISOStringSafe(shipment.seller.banned_at),
                    lastLoginAt:
                      shipment.seller.last_login_at === null
                        ? null
                        : toISOStringSafe(shipment.seller.last_login_at),
                    createdAt: toISOStringSafe(shipment.seller.created_at),
                    updatedAt: toISOStringSafe(shipment.seller.updated_at),
                    deletedAt:
                      shipment.seller.deleted_at === null
                        ? null
                        : toISOStringSafe(shipment.seller.deleted_at),
                    sellerProfile: {} as IShoppingMallSellerProfile.ISummary,
                  } as IShoppingMallSeller.ISummary,
                  shopName: sellerProfile.shop_name,
                  shopDescription: sellerProfile.shop_description,
                  logoImageUrl: sellerProfile.logo_image_url,
                  created_at: toISOStringSafe(sellerProfile.created_at),
                  updated_at: toISOStringSafe(sellerProfile.updated_at),
                  deleted_at:
                    sellerProfile.deleted_at === null
                      ? null
                      : toISOStringSafe(sellerProfile.deleted_at),
                },
        },
        carrierName: shipment.carrier_name,
        trackingNumber: shipment.tracking_number,
        status: shipment.status,
        shippedAt:
          shipment.shipped_at === null
            ? null
            : toISOStringSafe(shipment.shipped_at),
        deliveredAt:
          shipment.delivered_at === null
            ? null
            : toISOStringSafe(shipment.delivered_at),
        createdAt: toISOStringSafe(shipment.created_at),
        updatedAt: toISOStringSafe(shipment.updated_at),
        deletedAt:
          shipment.deleted_at === null
            ? null
            : toISOStringSafe(shipment.deleted_at),
      };
    }),
  };
}
