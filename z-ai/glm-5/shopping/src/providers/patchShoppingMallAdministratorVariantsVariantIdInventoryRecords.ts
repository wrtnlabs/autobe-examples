import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorVariantsVariantIdInventoryRecords(props: {
  administrator: AdministratorPayload;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    variant_id: props.variantId,
    ...(props.body.source === "order" && { order_id: { not: null } }),
    ...(props.body.source === "cancellation" && {
      cancellation_request_id: { not: null },
    }),
    ...(props.body.source === "refund" && { refund_request_id: { not: null } }),
    ...(props.body.source === "manual" && {
      seller_id: { not: null },
      order_id: null,
      cancellation_request_id: null,
      refund_request_id: null,
    }),
    ...(props.body.search && {
      reason: { contains: props.body.search, mode: "insensitive" as const },
    }),
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  const orderByInput = (
    props.body.sort === "oldest"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_inventory_recordsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        variant: {
          select: {
            id: true,
            sku_code: true,
            option_values: true,
            price: true,
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
                    shop_name: true,
                    logo_image: true,
                    approval_status: true,
                    suspended: true,
                    banned: true,
                    created_at: true,
                  },
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    parent: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        created_at: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            order_number: true,
            total_price: true,
            status: true,
            created_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                display_name: true,
                phone_number: true,
                banned: true,
                created_at: true,
              },
            },
          },
        },
        cancellationRequest: {
          select: {
            id: true,
            status: true,
            reason: true,
            created_at: true,
            responded_at: true,
            orderItem: {
              select: {
                id: true,
                quantity: true,
                price: true,
                status: true,
                created_at: true,
                shopping_mall_shipment_id: true,
                order: {
                  select: {
                    id: true,
                    order_number: true,
                    total_price: true,
                    status: true,
                    created_at: true,
                    customer: {
                      select: {
                        id: true,
                        email: true,
                        display_name: true,
                        phone_number: true,
                        banned: true,
                        created_at: true,
                      },
                    },
                  },
                },
                product: {
                  select: {
                    id: true,
                    name: true,
                    base_price: true,
                    created_at: true,
                    seller: {
                      select: {
                        id: true,
                        shop_name: true,
                        logo_image: true,
                        approval_status: true,
                        suspended: true,
                        banned: true,
                        created_at: true,
                      },
                    },
                    category: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        created_at: true,
                        parent: {
                          select: {
                            id: true,
                            name: true,
                            description: true,
                            created_at: true,
                          },
                        },
                      },
                    },
                  },
                },
                variant: {
                  select: {
                    id: true,
                    sku_code: true,
                    option_values: true,
                    price: true,
                    created_at: true,
                  },
                },
                seller: {
                  select: {
                    id: true,
                    shop_name: true,
                    logo_image: true,
                    approval_status: true,
                    suspended: true,
                    banned: true,
                    created_at: true,
                  },
                },
              },
            },
            seller: {
              select: {
                id: true,
                shop_name: true,
                logo_image: true,
                approval_status: true,
                suspended: true,
                banned: true,
                created_at: true,
              },
            },
          },
        },
        refundRequest: {
          select: {
            id: true,
            reason: true,
            status: true,
            created_at: true,
            responded_at: true,
            orderItem: {
              select: {
                id: true,
                quantity: true,
                price: true,
                status: true,
                created_at: true,
                shopping_mall_shipment_id: true,
                order: {
                  select: {
                    id: true,
                    order_number: true,
                    total_price: true,
                    status: true,
                    created_at: true,
                    customer: {
                      select: {
                        id: true,
                        email: true,
                        display_name: true,
                        phone_number: true,
                        banned: true,
                        created_at: true,
                      },
                    },
                  },
                },
                product: {
                  select: {
                    id: true,
                    name: true,
                    base_price: true,
                    created_at: true,
                    seller: {
                      select: {
                        id: true,
                        shop_name: true,
                        logo_image: true,
                        approval_status: true,
                        suspended: true,
                        banned: true,
                        created_at: true,
                      },
                    },
                    category: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        created_at: true,
                        parent: {
                          select: {
                            id: true,
                            name: true,
                            description: true,
                            created_at: true,
                          },
                        },
                      },
                    },
                  },
                },
                variant: {
                  select: {
                    id: true,
                    sku_code: true,
                    option_values: true,
                    price: true,
                    created_at: true,
                  },
                },
                seller: {
                  select: {
                    id: true,
                    shop_name: true,
                    logo_image: true,
                    approval_status: true,
                    suspended: true,
                    banned: true,
                    created_at: true,
                  },
                },
              },
            },
          },
        },
        seller: {
          select: {
            id: true,
            shop_name: true,
            logo_image: true,
            approval_status: true,
            suspended: true,
            banned: true,
            created_at: true,
          },
        },
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(records, async (record) => {
    const variant = record.variant;
    const product = variant.product;
    const productSeller = product.seller;
    const category = product.category;
    const inventoryRecords =
      await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
        where: { variant_id: variant.id },
        _sum: { quantity_change: true },
      });
    const stock_quantity = (inventoryRecords._sum.quantity_change ??
      0) as number & tags.Type<"int32"> & tags.Minimum<0>;
    const productVariants =
      await MyGlobal.prisma.shopping_mall_product_variants.findMany({
        where: { shopping_mall_product_id: product.id, deleted_at: null },
        select: {
          price: true,
          id: true,
        },
      });
    const variantInventoryAggregates =
      await MyGlobal.prisma.shopping_mall_inventory_records.groupBy({
        by: ["variant_id"],
        where: { variant_id: { in: productVariants.map((v) => v.id) } },
        _sum: { quantity_change: true },
      });
    const stockMap = new Map(
      variantInventoryAggregates.map((a) => [
        a.variant_id,
        a._sum.quantity_change ?? 0,
      ]),
    );
    let min_price = product.base_price;
    let max_price = product.base_price;
    let allOutOfStock = productVariants.length > 0;
    for (const v of productVariants) {
      const effectivePrice = v.price ?? product.base_price;
      if (effectivePrice < min_price) min_price = effectivePrice;
      if (effectivePrice > max_price) max_price = effectivePrice;
      const stock = stockMap.get(v.id) ?? 0;
      if (stock > 0) allOutOfStock = false;
    }
    if (productVariants.length === 0) allOutOfStock = true;
    const productImages =
      await MyGlobal.prisma.shopping_mall_product_images.findMany({
        where: { shopping_mall_product_id: product.id },
        orderBy: { display_order: "asc" },
        select: { image_url: true, display_order: true },
      });
    const thumbnail =
      productImages.length > 0
        ? (productImages[0].image_url as string & tags.Format<"uri">)
        : null;
    const reviewAggregates =
      await MyGlobal.prisma.shopping_mall_reviews.aggregate({
        where: { shopping_mall_product_id: product.id, deleted_at: null },
        _avg: { rating: true },
        _count: true,
      });
    const average_rating = reviewAggregates._avg.rating ?? null;
    const review_count = reviewAggregates._count as number &
      tags.Type<"int32"> &
      tags.Minimum<0>;
    const transformedCategory: IShoppingMallCategory.ISummary = {
      id: category.id,
      name: category.name,
      description: category.description,
      parent: category.parent
        ? {
            id: category.parent.id,
            name: category.parent.name,
            description: category.parent.description,
            parent: null,
            created_at: toISOStringSafe(category.parent.created_at),
          }
        : null,
      created_at: toISOStringSafe(category.created_at),
    };
    const transformedProductSeller: IShoppingMallSeller.ISummary = {
      id: productSeller.id,
      shop_name: productSeller.shop_name,
      logo_image: productSeller.logo_image as
        | (string & tags.Format<"uri">)
        | null
        | undefined,
      approval_status: productSeller.approval_status as
        | "pending"
        | "approved"
        | "rejected",
      suspended: productSeller.suspended,
      banned: productSeller.banned,
      created_at: toISOStringSafe(productSeller.created_at),
    };
    const transformedProduct: IShoppingMallProduct.ISummary = {
      id: product.id,
      name: product.name,
      base_price: product.base_price,
      min_price,
      max_price,
      thumbnail,
      average_rating,
      review_count,
      seller: transformedProductSeller,
      category: transformedCategory,
      out_of_stock: allOutOfStock,
      created_at: toISOStringSafe(product.created_at),
    };
    const transformedVariant: IShoppingMallProductVariant.ISummary = {
      id: variant.id,
      product: transformedProduct,
      sku_code: variant.sku_code,
      option_values: JSON.parse(variant.option_values),
      price: variant.price ?? undefined,
      stock_quantity: stock_quantity,
      created_at: toISOStringSafe(variant.created_at),
    };
    const transformedOrder: IShoppingMallOrder.ISummary | null = record.order
      ? {
          id: record.order.id,
          order_number: record.order.order_number,
          total_price: record.order.total_price,
          status: record.order.status,
          customer: record.order.customer
            ? {
                id: record.order.customer.id,
                email: record.order.customer.email as string &
                  tags.Format<"email">,
                displayName: record.order.customer.display_name,
                phoneNumber: record.order.customer.phone_number,
                banned: record.order.customer.banned,
                createdAt: toISOStringSafe(record.order.customer.created_at),
              }
            : null,
          created_at: toISOStringSafe(record.order.created_at),
        }
      : null;
    const transformedCancellationRequest: IShoppingMallCancellationRequest.ISummary | null =
      record.cancellationRequest
        ? (() => {
            const oi = record.cancellationRequest!.orderItem;
            const oiProduct = oi.product;
            const oiCategory = oiProduct.category;
            const oiSeller = oi.seller;
            const oiVariant = oi.variant;
            const oiOrder = oi.order;
            const transformedOiSeller: IShoppingMallSeller.ISummary = {
              id: oiSeller.id,
              shop_name: oiSeller.shop_name,
              logo_image: oiSeller.logo_image as
                | (string & tags.Format<"uri">)
                | null
                | undefined,
              approval_status: oiSeller.approval_status as
                | "pending"
                | "approved"
                | "rejected",
              suspended: oiSeller.suspended,
              banned: oiSeller.banned,
              created_at: toISOStringSafe(oiSeller.created_at),
            };
            const transformedOiCategory: IShoppingMallCategory.ISummary = {
              id: oiCategory.id,
              name: oiCategory.name,
              description: oiCategory.description,
              parent: oiCategory.parent
                ? {
                    id: oiCategory.parent.id,
                    name: oiCategory.parent.name,
                    description: oiCategory.parent.description,
                    parent: null,
                    created_at: toISOStringSafe(oiCategory.parent.created_at),
                  }
                : null,
              created_at: toISOStringSafe(oiCategory.created_at),
            };
            const transformedOiProduct: IShoppingMallProduct.ISummary = {
              id: oiProduct.id,
              name: oiProduct.name,
              base_price: oiProduct.base_price,
              min_price: oiProduct.base_price,
              max_price: oiProduct.base_price,
              thumbnail: null,
              average_rating: null,
              review_count: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
              seller: transformedOiSeller,
              category: transformedOiCategory,
              out_of_stock: false,
              created_at: toISOStringSafe(oiProduct.created_at),
            };
            const transformedOiVariant: IShoppingMallProductVariant.ISummary = {
              id: oiVariant.id,
              product: transformedOiProduct,
              sku_code: oiVariant.sku_code,
              option_values: JSON.parse(oiVariant.option_values),
              price: oiVariant.price ?? undefined,
              stock_quantity: 0 as number &
                tags.Type<"int32"> &
                tags.Minimum<0>,
              created_at: toISOStringSafe(oiVariant.created_at),
            };
            const transformedOiOrder: IShoppingMallOrder.ISummary = {
              id: oiOrder.id,
              order_number: oiOrder.order_number,
              total_price: oiOrder.total_price,
              status: oiOrder.status,
              customer: oiOrder.customer
                ? {
                    id: oiOrder.customer.id,
                    email: oiOrder.customer.email as string &
                      tags.Format<"email">,
                    displayName: oiOrder.customer.display_name,
                    phoneNumber: oiOrder.customer.phone_number,
                    banned: oiOrder.customer.banned,
                    createdAt: toISOStringSafe(oiOrder.customer.created_at),
                  }
                : null,
              created_at: toISOStringSafe(oiOrder.created_at),
            };
            const transformedOi: IShoppingMallOrderItem.ISummary = {
              id: oi.id,
              quantity: oi.quantity as number &
                tags.Type<"int32"> &
                tags.Minimum<1>,
              price: oi.price,
              status: oi.status,
              created_at: toISOStringSafe(oi.created_at),
              shipment_id: oi.shopping_mall_shipment_id ?? undefined,
              order: transformedOiOrder,
              product: transformedOiProduct,
              variant: transformedOiVariant,
              seller: transformedOiSeller,
            };
            const crSeller = record.cancellationRequest!.seller;
            return {
              id: record.cancellationRequest!.id,
              status: record.cancellationRequest!.status,
              reason: record.cancellationRequest!.reason.slice(
                0,
                100,
              ) as string & tags.MaxLength<100>,
              orderItem: transformedOi,
              product: transformedOiProduct,
              seller: crSeller
                ? {
                    id: crSeller.id,
                    shop_name: crSeller.shop_name,
                    logo_image: crSeller.logo_image as
                      | (string & tags.Format<"uri">)
                      | null
                      | undefined,
                    approval_status: crSeller.approval_status as
                      | "pending"
                      | "approved"
                      | "rejected",
                    suspended: crSeller.suspended,
                    banned: crSeller.banned,
                    created_at: toISOStringSafe(crSeller.created_at),
                  }
                : undefined,
              created_at: toISOStringSafe(
                record.cancellationRequest!.created_at,
              ),
              responded_at: record.cancellationRequest!.responded_at
                ? toISOStringSafe(record.cancellationRequest!.responded_at)
                : null,
            };
          })()
        : null;
    const transformedRefundRequest: IShoppingMallRefundRequest.ISummary | null =
      record.refundRequest
        ? (() => {
            const rr = record.refundRequest!;
            const oi = rr.orderItem;
            const oiProduct = oi.product;
            const oiCategory = oiProduct.category;
            const oiSeller = oi.seller;
            const oiVariant = oi.variant;
            const oiOrder = oi.order;
            const transformedOiSeller: IShoppingMallSeller.ISummary = {
              id: oiSeller.id,
              shop_name: oiSeller.shop_name,
              logo_image: oiSeller.logo_image as
                | (string & tags.Format<"uri">)
                | null
                | undefined,
              approval_status: oiSeller.approval_status as
                | "pending"
                | "approved"
                | "rejected",
              suspended: oiSeller.suspended,
              banned: oiSeller.banned,
              created_at: toISOStringSafe(oiSeller.created_at),
            };
            const transformedOiCategory: IShoppingMallCategory.ISummary = {
              id: oiCategory.id,
              name: oiCategory.name,
              description: oiCategory.description,
              parent: oiCategory.parent
                ? {
                    id: oiCategory.parent.id,
                    name: oiCategory.parent.name,
                    description: oiCategory.parent.description,
                    parent: null,
                    created_at: toISOStringSafe(oiCategory.parent.created_at),
                  }
                : null,
              created_at: toISOStringSafe(oiCategory.created_at),
            };
            const transformedOiProduct: IShoppingMallProduct.ISummary = {
              id: oiProduct.id,
              name: oiProduct.name,
              base_price: oiProduct.base_price,
              min_price: oiProduct.base_price,
              max_price: oiProduct.base_price,
              thumbnail: null,
              average_rating: null,
              review_count: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
              seller: transformedOiSeller,
              category: transformedOiCategory,
              out_of_stock: false,
              created_at: toISOStringSafe(oiProduct.created_at),
            };
            const transformedOiVariant: IShoppingMallProductVariant.ISummary = {
              id: oiVariant.id,
              product: transformedOiProduct,
              sku_code: oiVariant.sku_code,
              option_values: JSON.parse(oiVariant.option_values),
              price: oiVariant.price ?? undefined,
              stock_quantity: 0 as number &
                tags.Type<"int32"> &
                tags.Minimum<0>,
              created_at: toISOStringSafe(oiVariant.created_at),
            };
            const transformedOiCustomer: IShoppingMallCustomer.ISummary | null =
              oiOrder.customer
                ? {
                    id: oiOrder.customer.id,
                    email: oiOrder.customer.email as string &
                      tags.Format<"email">,
                    displayName: oiOrder.customer.display_name,
                    phoneNumber: oiOrder.customer.phone_number,
                    banned: oiOrder.customer.banned,
                    createdAt: toISOStringSafe(oiOrder.customer.created_at),
                  }
                : null;
            const transformedOiOrder: IShoppingMallOrder.ISummary = {
              id: oiOrder.id,
              order_number: oiOrder.order_number,
              total_price: oiOrder.total_price,
              status: oiOrder.status,
              customer: transformedOiCustomer,
              created_at: toISOStringSafe(oiOrder.created_at),
            };
            const transformedOi: IShoppingMallOrderItem.ISummary = {
              id: oi.id,
              quantity: oi.quantity as number &
                tags.Type<"int32"> &
                tags.Minimum<1>,
              price: oi.price,
              status: oi.status,
              created_at: toISOStringSafe(oi.created_at),
              shipment_id: oi.shopping_mall_shipment_id ?? undefined,
              order: transformedOiOrder,
              product: transformedOiProduct,
              variant: transformedOiVariant,
              seller: transformedOiSeller,
            };
            return {
              id: rr.id,
              reason: rr.reason,
              status: rr.status,
              created_at: toISOStringSafe(rr.created_at),
              responded_at: rr.responded_at
                ? toISOStringSafe(rr.responded_at)
                : null,
              orderItem: transformedOi,
              order: transformedOiOrder,
              customer: transformedOiCustomer!,
              seller: transformedOiSeller,
            };
          })()
        : null;
    const transformedRecordSeller: IShoppingMallSeller.ISummary | null =
      record.seller
        ? {
            id: record.seller.id,
            shop_name: record.seller.shop_name,
            logo_image: record.seller.logo_image as
              | (string & tags.Format<"uri">)
              | null
              | undefined,
            approval_status: record.seller.approval_status as
              | "pending"
              | "approved"
              | "rejected",
            suspended: record.seller.suspended,
            banned: record.seller.banned,
            created_at: toISOStringSafe(record.seller.created_at),
          }
        : null;
    return {
      id: record.id,
      variant: transformedVariant,
      order: transformedOrder,
      cancellationRequest: transformedCancellationRequest,
      refundRequest: transformedRefundRequest,
      seller: transformedRecordSeller,
      quantityChange: record.quantity_change as number & tags.Type<"int32">,
      reason: record.reason,
      createdAt: toISOStringSafe(record.created_at),
    } satisfies IShoppingMallInventoryRecord.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIShoppingMallInventoryRecord.ISummary;
}
