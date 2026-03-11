import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductDeletion";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminProductDeletions(props: {
  admin: AdminPayload;
  body: IEcommerceMallProductDeletion.ICreate;
}): Promise<IEcommerceMallProductDeletion> {
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.body.product_id },
      select: {
        id: true,
        name: true,
        base_price: true,
        is_available: true,
        created_at: true,
        seller: {
          select: {
            id: true,
            shop_name: true,
            approval_status: true,
            is_suspended: true,
            created_at: true,
          },
        },
        images: {
          where: { is_main: true },
          select: {
            id: true,
            image_url: true,
            sort_order: true,
            is_main: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
          take: 1,
        },
      },
    });
  const created = await MyGlobal.prisma.ecommerce_mall_product_deletions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        product_id: props.body.product_id,
        admin_id: props.admin.id,
        reason: props.body.reason,
        status: "pending",
        responded_at: null,
        approval_notes: null,
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: {
        id: true,
        product_id: true,
        admin_id: true,
        reason: true,
        status: true,
        responded_at: true,
        approval_notes: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            is_available: true,
            created_at: true,
            seller: {
              select: {
                id: true,
                shop_name: true,
                approval_status: true,
                is_suspended: true,
                created_at: true,
              },
            },
            images: {
              where: { is_main: true },
              select: {
                id: true,
                image_url: true,
                sort_order: true,
                is_main: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
              take: 1,
            },
          },
        },
        admin: {
          select: {
            id: true,
            email: true,
            grade: true,
            created_at: true,
          },
        },
        parentRequest: {
          select: {
            id: true,
            product_id: true,
            admin_id: true,
            reason: true,
            status: true,
            created_at: true,
            updated_at: true,
            product: {
              select: {
                id: true,
                name: true,
                base_price: true,
                is_available: true,
                created_at: true,
                seller: {
                  select: {
                    id: true,
                    shop_name: true,
                    approval_status: true,
                    is_suspended: true,
                    created_at: true,
                  },
                },
                images: {
                  where: { is_main: true },
                  select: {
                    id: true,
                    image_url: true,
                    sort_order: true,
                    is_main: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                  take: 1,
                },
              },
            },
            admin: {
              select: {
                id: true,
                email: true,
                grade: true,
                created_at: true,
              },
            },
            parentRequest: { select: { id: true } },
            followUpRequests: { select: { id: true } },
          },
        },
        followUpRequests: {
          select: {
            id: true,
            product_id: true,
            admin_id: true,
            reason: true,
            status: true,
            created_at: true,
            updated_at: true,
            product: {
              select: {
                id: true,
                name: true,
                base_price: true,
                is_available: true,
                created_at: true,
                seller: {
                  select: {
                    id: true,
                    shop_name: true,
                    approval_status: true,
                    is_suspended: true,
                    created_at: true,
                  },
                },
                images: {
                  where: { is_main: true },
                  select: {
                    id: true,
                    image_url: true,
                    sort_order: true,
                    is_main: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                  take: 1,
                },
              },
            },
            admin: {
              select: {
                id: true,
                email: true,
                grade: true,
                created_at: true,
              },
            },
            parentRequest: { select: { id: true } },
            followUpRequests: { select: { id: true } },
          },
        },
      },
    },
  );
  return {
    id: created.id,
    product_id: created.product_id,
    admin_id: created.admin_id,
    reason: created.reason,
    status: created.status as "pending" | "approved" | "rejected",
    responded_at: created.responded_at
      ? toISOStringSafe(created.responded_at)
      : null,
    approval_notes: created.approval_notes,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    product: {
      id: created.product.id,
      name: created.product.name,
      base_price: created.product.base_price,
      is_available: created.product.is_available,
      created_at: toISOStringSafe(created.product.created_at),
      seller: {
        id: created.product.seller.id,
        shop_name: created.product.seller.shop_name,
        approval_status: created.product.seller.approval_status as
          | "pending"
          | "approved"
          | "rejected",
        is_suspended: created.product.seller.is_suspended,
        created_at: toISOStringSafe(created.product.seller.created_at),
      },
      main_image:
        created.product.images.length > 0
          ? {
              id: created.product.images[0].id,
              image_url: created.product.images[0].image_url,
              sort_order: created.product.images[0].sort_order,
              is_main: created.product.images[0].is_main,
              created_at: toISOStringSafe(created.product.images[0].created_at),
              updated_at: toISOStringSafe(created.product.images[0].updated_at),
              deleted_at: created.product.images[0].deleted_at
                ? toISOStringSafe(created.product.images[0].deleted_at)
                : null,
            }
          : {
              id: "",
              image_url: "",
              sort_order: 0,
              is_main: false,
              created_at: "",
              updated_at: "",
              deleted_at: null,
            },
    },
    admin: {
      id: created.admin.id,
      email: created.admin.email,
      grade: created.admin.grade as "regular" | "super",
      created_at: toISOStringSafe(created.admin.created_at),
    },
    parentRequest: created.parentRequest
      ? {
          id: created.parentRequest.id,
          product_id: created.parentRequest.product_id,
          admin_id: created.parentRequest.admin_id,
          reason: created.parentRequest.reason,
          status: created.parentRequest.status as
            | "pending"
            | "approved"
            | "rejected",
          created_at: toISOStringSafe(created.parentRequest.created_at),
          updated_at: toISOStringSafe(created.parentRequest.updated_at),
          product: {
            id: created.parentRequest.product.id,
            name: created.parentRequest.product.name,
            base_price: created.parentRequest.product.base_price,
            is_available: created.parentRequest.product.is_available,
            created_at: toISOStringSafe(
              created.parentRequest.product.created_at,
            ),
            seller: {
              id: created.parentRequest.product.seller.id,
              shop_name: created.parentRequest.product.seller.shop_name,
              approval_status: created.parentRequest.product.seller
                .approval_status as "pending" | "approved" | "rejected",
              is_suspended: created.parentRequest.product.seller.is_suspended,
              created_at: toISOStringSafe(
                created.parentRequest.product.seller.created_at,
              ),
            },
            main_image:
              created.parentRequest.product.images.length > 0
                ? {
                    id: created.parentRequest.product.images[0].id,
                    image_url:
                      created.parentRequest.product.images[0].image_url,
                    sort_order:
                      created.parentRequest.product.images[0].sort_order,
                    is_main: created.parentRequest.product.images[0].is_main,
                    created_at: toISOStringSafe(
                      created.parentRequest.product.images[0].created_at,
                    ),
                    updated_at: toISOStringSafe(
                      created.parentRequest.product.images[0].updated_at,
                    ),
                    deleted_at: created.parentRequest.product.images[0]
                      .deleted_at
                      ? toISOStringSafe(
                          created.parentRequest.product.images[0].deleted_at,
                        )
                      : null,
                  }
                : {
                    id: "",
                    image_url: "",
                    sort_order: 0,
                    is_main: false,
                    created_at: "",
                    updated_at: "",
                    deleted_at: null,
                  },
          },
          admin: {
            id: created.parentRequest.admin.id,
            email: created.parentRequest.admin.email,
            grade: created.parentRequest.admin.grade as "regular" | "super",
            created_at: toISOStringSafe(created.parentRequest.admin.created_at),
          },
          parentRequest: created.parentRequest.parentRequest
            ? {
                id: created.parentRequest.parentRequest.id,
                product_id: created.parentRequest.parentRequest.product_id,
                admin_id: created.parentRequest.parentRequest.admin_id,
                reason: created.parentRequest.parentRequest.reason,
                status: created.parentRequest.parentRequest.status as
                  | "pending"
                  | "approved"
                  | "rejected",
                created_at: toISOStringSafe(
                  created.parentRequest.parentRequest.created_at,
                ),
                updated_at: toISOStringSafe(
                  created.parentRequest.parentRequest.updated_at,
                ),
                product: {
                  id: created.parentRequest.parentRequest.product.id,
                  name: created.parentRequest.parentRequest.product.name,
                  base_price:
                    created.parentRequest.parentRequest.product.base_price,
                  is_available:
                    created.parentRequest.parentRequest.product.is_available,
                  created_at: toISOStringSafe(
                    created.parentRequest.parentRequest.product.created_at,
                  ),
                  seller: {
                    id: created.parentRequest.parentRequest.product.seller.id,
                    shop_name:
                      created.parentRequest.parentRequest.product.seller
                        .shop_name,
                    approval_status: created.parentRequest.parentRequest.product
                      .seller.approval_status as
                      | "pending"
                      | "approved"
                      | "rejected",
                    is_suspended:
                      created.parentRequest.parentRequest.product.seller
                        .is_suspended,
                    created_at: toISOStringSafe(
                      created.parentRequest.parentRequest.product.seller
                        .created_at,
                    ),
                  },
                  main_image:
                    created.parentRequest.parentRequest.product.images.length >
                    0
                      ? {
                          id: created.parentRequest.parentRequest.product
                            .images[0].id,
                          image_url:
                            created.parentRequest.parentRequest.product
                              .images[0].image_url,
                          sort_order:
                            created.parentRequest.parentRequest.product
                              .images[0].sort_order,
                          is_main:
                            created.parentRequest.parentRequest.product
                              .images[0].is_main,
                          created_at: toISOStringSafe(
                            created.parentRequest.parentRequest.product
                              .images[0].created_at,
                          ),
                          updated_at: toISOStringSafe(
                            created.parentRequest.parentRequest.product
                              .images[0].updated_at,
                          ),
                          deleted_at: created.parentRequest.parentRequest
                            .product.images[0].deleted_at
                            ? toISOStringSafe(
                                created.parentRequest.parentRequest.product
                                  .images[0].deleted_at,
                              )
                            : null,
                        }
                      : {
                          id: "",
                          image_url: "",
                          sort_order: 0,
                          is_main: false,
                          created_at: "",
                          updated_at: "",
                          deleted_at: null,
                        },
                },
                admin: {
                  id: created.parentRequest.parentRequest.admin.id,
                  email: created.parentRequest.parentRequest.admin.email,
                  grade: created.parentRequest.parentRequest.admin.grade as
                    | "regular"
                    | "super",
                  created_at: toISOStringSafe(
                    created.parentRequest.parentRequest.admin.created_at,
                  ),
                },
                parentRequest: null,
                followUpRequests: [],
              }
            : null,
          followUpRequests: created.parentRequest.followUpRequests.map((f) => ({
            id: f.id,
            product_id: f.product_id,
            admin_id: f.admin_id,
            reason: f.reason,
            status: f.status as "pending" | "approved" | "rejected",
            created_at: toISOStringSafe(f.created_at),
            updated_at: toISOStringSafe(f.updated_at),
            product: {
              id: f.product.id,
              name: f.product.name,
              base_price: f.product.base_price,
              is_available: f.product.is_available,
              created_at: toISOStringSafe(f.product.created_at),
              seller: {
                id: f.product.seller.id,
                shop_name: f.product.seller.shop_name,
                approval_status: f.product.seller.approval_status as
                  | "pending"
                  | "approved"
                  | "rejected",
                is_suspended: f.product.seller.is_suspended,
                created_at: toISOStringSafe(f.product.seller.created_at),
              },
              main_image:
                f.product.images.length > 0
                  ? {
                      id: f.product.images[0].id,
                      image_url: f.product.images[0].image_url,
                      sort_order: f.product.images[0].sort_order,
                      is_main: f.product.images[0].is_main,
                      created_at: toISOStringSafe(
                        f.product.images[0].created_at,
                      ),
                      updated_at: toISOStringSafe(
                        f.product.images[0].updated_at,
                      ),
                      deleted_at: f.product.images[0].deleted_at
                        ? toISOStringSafe(f.product.images[0].deleted_at)
                        : null,
                    }
                  : {
                      id: "",
                      image_url: "",
                      sort_order: 0,
                      is_main: false,
                      created_at: "",
                      updated_at: "",
                      deleted_at: null,
                    },
            },
            admin: {
              id: f.admin.id,
              email: f.admin.email,
              grade: f.admin.grade as "regular" | "super",
              created_at: toISOStringSafe(f.admin.created_at),
            },
            parentRequest: null,
            followUpRequests: [],
          })),
        }
      : null,
    followUpRequests: created.followUpRequests.map((f) => ({
      id: f.id,
      product_id: f.product_id,
      admin_id: f.admin_id,
      reason: f.reason,
      status: f.status as "pending" | "approved" | "rejected",
      created_at: toISOStringSafe(f.created_at),
      updated_at: toISOStringSafe(f.updated_at),
      product: {
        id: f.product.id,
        name: f.product.name,
        base_price: f.product.base_price,
        is_available: f.product.is_available,
        created_at: toISOStringSafe(f.product.created_at),
        seller: {
          id: f.product.seller.id,
          shop_name: f.product.seller.shop_name,
          approval_status: f.product.seller.approval_status as
            | "pending"
            | "approved"
            | "rejected",
          is_suspended: f.product.seller.is_suspended,
          created_at: toISOStringSafe(f.product.seller.created_at),
        },
        main_image:
          f.product.images.length > 0
            ? {
                id: f.product.images[0].id,
                image_url: f.product.images[0].image_url,
                sort_order: f.product.images[0].sort_order,
                is_main: f.product.images[0].is_main,
                created_at: toISOStringSafe(f.product.images[0].created_at),
                updated_at: toISOStringSafe(f.product.images[0].updated_at),
                deleted_at: f.product.images[0].deleted_at
                  ? toISOStringSafe(f.product.images[0].deleted_at)
                  : null,
              }
            : {
                id: "",
                image_url: "",
                sort_order: 0,
                is_main: false,
                created_at: "",
                updated_at: "",
                deleted_at: null,
              },
      },
      admin: {
        id: f.admin.id,
        email: f.admin.email,
        grade: f.admin.grade as "regular" | "super",
        created_at: toISOStringSafe(f.admin.created_at),
      },
      parentRequest: f.parentRequest
        ? {
            id: f.parentRequest.id,
            product_id: f.parentRequest.product_id,
            admin_id: f.parentRequest.admin_id,
            reason: f.parentRequest.reason,
            status: f.parentRequest.status as
              | "pending"
              | "approved"
              | "rejected",
            created_at: toISOStringSafe(f.parentRequest.created_at),
            updated_at: toISOStringSafe(f.parentRequest.updated_at),
            product: {
              id: f.parentRequest.product.id,
              name: f.parentRequest.product.name,
              base_price: f.parentRequest.product.base_price,
              is_available: f.parentRequest.product.is_available,
              created_at: toISOStringSafe(f.parentRequest.product.created_at),
              seller: {
                id: f.parentRequest.product.seller.id,
                shop_name: f.parentRequest.product.seller.shop_name,
                approval_status: f.parentRequest.product.seller
                  .approval_status as "pending" | "approved" | "rejected",
                is_suspended: f.parentRequest.product.seller.is_suspended,
                created_at: toISOStringSafe(
                  f.parentRequest.product.seller.created_at,
                ),
              },
              main_image:
                f.parentRequest.product.images.length > 0
                  ? {
                      id: f.parentRequest.product.images[0].id,
                      image_url: f.parentRequest.product.images[0].image_url,
                      sort_order: f.parentRequest.product.images[0].sort_order,
                      is_main: f.parentRequest.product.images[0].is_main,
                      created_at: toISOStringSafe(
                        f.parentRequest.product.images[0].created_at,
                      ),
                      updated_at: toISOStringSafe(
                        f.parentRequest.product.images[0].updated_at,
                      ),
                      deleted_at: f.parentRequest.product.images[0].deleted_at
                        ? toISOStringSafe(
                            f.parentRequest.product.images[0].deleted_at,
                          )
                        : null,
                    }
                  : {
                      id: "",
                      image_url: "",
                      sort_order: 0,
                      is_main: false,
                      created_at: "",
                      updated_at: "",
                      deleted_at: null,
                    },
            },
            admin: {
              id: f.parentRequest.admin.id,
              email: f.parentRequest.admin.email,
              grade: f.parentRequest.admin.grade as "regular" | "super",
              created_at: toISOStringSafe(f.parentRequest.admin.created_at),
            },
            parentRequest: null,
            followUpRequests: [],
          }
        : null,
      followUpRequests: [],
    })),
  };
}
