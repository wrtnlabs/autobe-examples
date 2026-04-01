import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
      },
      select: {
        id: true,
        entity_type: true,
        entity_id: true,
        snapshot_data: true,
        version: true,
        created_at: true,
        updated_at: true,
        actor_id: true,
        actor: {
          select: {
            id: true,
            email: true,
            status: true,
            created_at: true,
          },
        },
      },
    });
  // Authorization checks
  let authorized = false;
  // Check 1: Actor is the customer
  if (snapshot.actor_id === props.customer.id) {
    authorized = true;
  }
  // Check 2: Entity type is review and customer owns the review
  if (!authorized && snapshot.entity_type === "review") {
    const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUnique({
      where: {
        id: snapshot.entity_id,
      },
      select: {
        customer: {
          select: {
            id: true,
          },
        },
      },
    });
    if (review && review.customer.id === props.customer.id) {
      authorized = true;
    }
  }
  // Check 3: Entity type is cancellation_request and customer owns it
  if (!authorized && snapshot.entity_type === "cancellation_request") {
    const cancellationRequest =
      await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUnique({
        where: {
          id: snapshot.entity_id,
        },
        select: {
          customer: {
            select: {
              id: true,
            },
          },
        },
      });
    if (
      cancellationRequest &&
      cancellationRequest.customer.id === props.customer.id
    ) {
      authorized = true;
    }
  }
  // Check 4: Entity type is refund_request and customer owns it
  if (!authorized && snapshot.entity_type === "refund_request") {
    const refundRequest =
      await MyGlobal.prisma.ecommerce_mall_refund_requests.findUnique({
        where: {
          id: snapshot.entity_id,
        },
        select: {
          customer: {
            select: {
              id: true,
            },
          },
        },
      });
    if (refundRequest && refundRequest.customer.id === props.customer.id) {
      authorized = true;
    }
  }
  if (!authorized) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform actor if present
  let actor:
    | IEcommerceMallCustomer.ISummary
    | IEcommerceMallSeller.ISummary
    | IEcommerceMallAdmin.ISummary
    | IEcommerceMallSuperAdmin.ISummary
    | null = null;
  if (snapshot.actor) {
    actor = await EcommerceMallCustomerAtSummaryTransformer.transform(
      snapshot.actor,
    );
  }
  // Transform entity based on entity_type
  let entity:
    | (
        | IEcommerceMallProduct.ISummary
        | IEcommerceMallProductVariant.ISummary
        | IEcommerceMallReview.ISummary
        | IEcommerceMallCancellationRequest.ISummary
        | IEcommerceMallRefundRequest.ISummary
      )
    | null = null;
  if (snapshot.entity_type === "product") {
    const product =
      await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
        where: {
          id: snapshot.entity_id,
        },
        ...EcommerceMallProductAtSummaryTransformer.select(),
      });
    entity = await EcommerceMallProductAtSummaryTransformer.transform(product);
  } else if (snapshot.entity_type === "product_variant") {
    // No transformer available - manual transformation
    const variant =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
        where: {
          id: snapshot.entity_id,
        },
        select: {
          id: true,
          sku: true,
          options: true,
          base_price: true,
          sale_price: true,
          stock_quantity: true,
          reserved_quantity: true,
          status: true,
          sort_order: true,
          is_default: true,
          product_id: true,
          product: {
            select: {
              id: true,
              name: true,
              base_price: true,
              slug: true,
              status: true,
              category_id: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  parent_id: true,
                  display_order: true,
                  is_active: true,
                },
              },
              deleted_at: true,
            },
          },
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    entity = {
      id: variant.id,
      sku: variant.sku,
      options: JSON.parse(variant.options),
      basePrice: variant.base_price,
      salePrice: variant.sale_price,
      stockQuantity: variant.stock_quantity,
      reservedQuantity: variant.reserved_quantity,
      status: variant.status,
      sortOrder: variant.sort_order,
      isDefault: variant.is_default,
      product: {
        id: variant.product.id,
        name: variant.product.name,
        base_price: variant.product.base_price,
        slug: variant.product.slug,
        status: variant.product.status,
        category: {
          id: variant.product.category.id,
          name: variant.product.category.name,
          slug: variant.product.category.slug,
          parent_id: variant.product.category.parent_id ?? undefined,
          display_order: variant.product.category.display_order ?? undefined,
          is_active: variant.product.category.is_active ?? undefined,
        } satisfies IEcommerceMallCategory.ISummary,
        deleted_at: variant.product.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallProduct.ISummary,
      createdAt: variant.created_at.toISOString(),
      updatedAt: variant.updated_at.toISOString(),
      deletedAt: variant.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallProductVariant.ISummary;
  } else if (snapshot.entity_type === "review") {
    // No transformer available - manual transformation
    const review =
      await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
        where: {
          id: snapshot.entity_id,
        },
        select: {
          id: true,
          customer_id: true,
          product_id: true,
          rating: true,
          title: true,
          is_verified_purchase: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          customer: {
            select: {
              id: true,
              email: true,
              status: true,
              created_at: true,
              deleted_at: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              base_price: true,
              slug: true,
              status: true,
              category_id: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  parent_id: true,
                  display_order: true,
                  is_active: true,
                },
              },
              deleted_at: true,
            },
          },
        },
      });
    entity = {
      id: review.id,
      customer: {
        id: review.customer.id,
        email: review.customer.email,
        status: review.customer.status,
        created_at: review.customer.created_at.toISOString(),
        deleted_at: review.customer.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallCustomer.ISummary,
      product: {
        id: review.product.id,
        name: review.product.name,
        base_price: review.product.base_price,
        slug: review.product.slug,
        status: review.product.status,
        category: {
          id: review.product.category.id,
          name: review.product.category.name,
          slug: review.product.category.slug,
          parent_id: review.product.category.parent_id ?? undefined,
          display_order: review.product.category.display_order ?? undefined,
          is_active: review.product.category.is_active ?? undefined,
        } satisfies IEcommerceMallCategory.ISummary,
        deleted_at: review.product.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallProduct.ISummary,
      rating: review.rating,
      title: review.title,
      is_verified_purchase: review.is_verified_purchase,
      helpfulness_vote_count: 0,
      created_at: review.created_at.toISOString(),
      updated_at: review.updated_at.toISOString(),
      deleted_at: review.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallReview.ISummary;
  } else if (snapshot.entity_type === "cancellation_request") {
    // No transformer available - manual transformation
    const request =
      await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
        {
          where: {
            id: snapshot.entity_id,
          },
          select: {
            id: true,
            customer_id: true,
            order_item_id: true,
            status: true,
            reason: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                status: true,
                created_at: true,
                deleted_at: true,
              },
            },
            orderItem: {
              select: {
                id: true,
                product_name: true,
                product_sku: true,
                variant_name: true,
                quantity: true,
                unit_price: true,
                total_price: true,
                order_id: true,
                order: {
                  select: {
                    id: true,
                    order_number: true,
                    total_price: true,
                    status: true,
                  },
                },
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      );
    entity = {
      id: request.id,
      status: request.status,
      reason: request.reason,
      created_at: request.created_at.toISOString(),
      updated_at: request.updated_at.toISOString(),
      deleted_at: request.deleted_at?.toISOString() ?? null,
      customer: {
        id: request.customer.id,
        email: request.customer.email,
        status: request.customer.status,
        created_at: request.customer.created_at.toISOString(),
        deleted_at: request.customer.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallCustomer.ISummary,
      orderItem: {
        id: request.orderItem.id,
        productName: request.orderItem.product_name,
        productSku: request.orderItem.product_sku,
        variantName: request.orderItem.variant_name,
        quantity: request.orderItem.quantity,
        unitPrice: request.orderItem.unit_price,
        totalPrice: request.orderItem.total_price,
        order: {
          id: request.orderItem.order.id,
          order_number: request.orderItem.order.order_number,
          total_price: request.orderItem.order.total_price,
          status: request.orderItem.order.status,
          shipping_address: {
            id: "" as string & tags.Format<"uuid">,
            recipient_name: "",
            recipient_phone: "",
            street: "",
            city: "",
            state: "",
            is_default: false,
            created_at: "",
            updated_at: "",
            deleted_at: null,
          },
          created_at: "",
          deleted_at: null,
        } satisfies IEcommerceMallOrder.ISummary,
        createdAt: request.orderItem.created_at.toISOString(),
        updatedAt: request.orderItem.updated_at.toISOString(),
        deletedAt: request.orderItem.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallOrderItem.ISummary,
    } satisfies IEcommerceMallCancellationRequest.ISummary;
  } else if (snapshot.entity_type === "refund_request") {
    // No transformer available - manual transformation
    const request =
      await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
        where: {
          id: snapshot.entity_id,
        },
        select: {
          id: true,
          customer_id: true,
          order_item_id: true,
          refund_code: true,
          status: true,
          delivery_date: true,
          submitted_at: true,
          decision_at: true,
          processed_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          customer: {
            select: {
              id: true,
              email: true,
              status: true,
              created_at: true,
              deleted_at: true,
            },
          },
          orderItem: {
            select: {
              id: true,
              product_name: true,
              product_sku: true,
              variant_name: true,
              quantity: true,
              unit_price: true,
              total_price: true,
              order_id: true,
              order: {
                select: {
                  id: true,
                  order_number: true,
                  total_price: true,
                  status: true,
                },
              },
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      });
    entity = {
      id: request.id,
      refund_code: request.refund_code,
      status: request.status,
      customer: {
        id: request.customer.id,
        email: request.customer.email,
        status: request.customer.status,
        created_at: request.customer.created_at.toISOString(),
        deleted_at: request.customer.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallCustomer.ISummary,
      orderItem: {
        id: request.orderItem.id,
        productName: request.orderItem.product_name,
        productSku: request.orderItem.product_sku,
        variantName: request.orderItem.variant_name,
        quantity: request.orderItem.quantity,
        unitPrice: request.orderItem.unit_price,
        totalPrice: request.orderItem.total_price,
        order: {
          id: request.orderItem.order.id,
          order_number: request.orderItem.order.order_number,
          total_price: request.orderItem.order.total_price,
          status: request.orderItem.order.status,
          shipping_address: {
            id: "" as string & tags.Format<"uuid">,
            recipient_name: "",
            recipient_phone: "",
            street: "",
            city: "",
            state: "",
            is_default: false,
            created_at: "",
            updated_at: "",
            deleted_at: null,
          },
          created_at: "",
          deleted_at: null,
        } satisfies IEcommerceMallOrder.ISummary,
        createdAt: request.orderItem.created_at.toISOString(),
        updatedAt: request.orderItem.updated_at.toISOString(),
        deletedAt: request.orderItem.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallOrderItem.ISummary,
      delivery_date: request.delivery_date.toISOString(),
      submitted_at: request.submitted_at?.toISOString() ?? null,
      decision_at: request.decision_at?.toISOString() ?? null,
      processed_at: request.processed_at?.toISOString() ?? null,
      created_at: request.created_at.toISOString(),
      updated_at: request.updated_at.toISOString(),
      deleted_at: request.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallRefundRequest.ISummary;
  }
  return {
    id: snapshot.id,
    entity_id: snapshot.entity_id,
    entity_type: snapshot.entity_type,
    snapshot_data: snapshot.snapshot_data,
    version: snapshot.version,
    created_at: snapshot.created_at.toISOString(),
    updated_at: snapshot.updated_at.toISOString(),
    actor_id: snapshot.actor_id ?? undefined,
    actor: actor,
    entity: entity ?? null,
  } satisfies IEcommerceMallSnapshot;
}
