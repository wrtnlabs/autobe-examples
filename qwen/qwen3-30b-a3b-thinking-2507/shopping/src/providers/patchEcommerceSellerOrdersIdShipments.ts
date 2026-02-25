import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { SellerPayload } from "../decorators/payload/SellerPayload"

export async function patchEcommerceSellerOrdersIdShipments(props: {
    seller: SellerPayload;
    id: string & tags.Format<"uuid">;
    body: IEcommerceShipment.IRequest;
}): Promise<IPageIEcommerceShipment.ISummary> {
    const { page = 1, limit = 10, status, carrierName = props.body };
    const skip = (page - 1) * limit;
    // Verify order exists
    const order = await MyGlobal.prisma.ecommerce_orders.findUnique({
        where: { id: props.id, deleted_at: null },
    });
    if (!order) {
        throw new HttpException("Order not found", 404);
    }
    // Verify seller owns products in this order
    const orderItems = await MyGlobal.prisma.ecommerce_order_items.findMany({
        where: { order_id: props.id, deleted_at: null },
        select: {
            variant: {
                select: {
                    product: {
                        select: {
                            seller_id: true
                        }
                    }
                }
            }
        },
    });
    const sellerOwnsProductInOrder = orderItems.some((item) => item.variant?.product?.seller_id === props.seller.id);
    if (!sellerOwnsProductInOrder) {
        throw new HttpException("Order not found for this seller", 404);
    }
    // Build filter conditions
    const where: Partial<Prisma.ecommerce_shipmentsWhereInput> = {
        ecommerce_order_id: props.id,
    };
    if (status) {
        where.status = status;
    }
    if (carrierName) {
        where.carrier_name = carrierName;
    }
    // Fetch shipments with pagination
    const [shipments, total] = await Promise.all([
        MyGlobal.prisma.ecommerce_shipments.findMany({
            where,
            skip,
            take: limit,
            orderBy: { created_at: "desc" },
        }),
        MyGlobal.prisma.ecommerce_shipments.count({ where }),
    ]);
    // Get customer and shipping address details
    const customer = await MyGlobal.prisma.ecommerce_customers.findUnique({
        where: { id: order.customer_id },
        select: {
            id: true,
            email: true,
            email_verified: true,
            is_suspended: true,
            created_at: true,
        },
    });
    const shippingAddress = await MyGlobal.prisma.ecommerce_customer_addresses.findUnique({
        where: { id: order.shipping_address_id },
        select: {
            id: true,
            street_address: true,
            city: true,
            state: true,
            postal_code: true,
            country: true,
            is_default: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
        },
    });
    // Transform each shipment to summary format
    const transformedShipments = await Promise.all(shipments.map(async (shipment) => ({
        id: shipment.id as string & tags.Format<"uuid">,
        carrier_name: shipment.carrier_name,
        tracking_number: shipment.tracking_number,
        status: shipment.status,
        shipment_date: shipment.shipment_date
            ? toISOStringSafe(shipment.shipment_date)
            : null,
        expected_delivery_date: shipment.expected_delivery_date
            ? toISOStringSafe(shipment.expected_delivery_date)
            : null,
        created_at: shipment.created_at
            ? toISOStringSafe(shipment.created_at)
            : null,
        order: {
            id: order.id as string & tags.Format<"uuid">,
            status: order.status,
            total_amount: order.total_amount,
            created_at: order.created_at
                ? toISOStringSafe(order.created_at)
                : null,
            customer: {
                id: customer?.id as string & tags.Format<"uuid">,
                email: customer?.email,
                emailVerified: customer?.email_verified,
                isSuspended: customer?.is_suspended,
                createdAt: customer?.created_at
                    ? toISOStringSafe(customer.created_at)
                    : null,
                shippingAddress: {
                    id: shippingAddress?.id as string & tags.Format<"uuid">,
                    street_address: shippingAddress?.street_address,
                    city: shippingAddress?.city,
                    state: shippingAddress?.state,
                    postal_code: shippingAddress?.postal_code,
                    country: shippingAddress?.country,
                    is_default: shippingAddress?.is_default,
                    created_at: shippingAddress?.created_at
                        ? toISOStringSafe(shippingAddress.created_at)
                        : null,
                    updated_at: shippingAddress?.updated_at
                        ? toISOStringSafe(shippingAddress.updated_at)
                        : null,
                    deleted_at: shippingAddress?.deleted_at
                        ? toISOStringSafe(shippingAddress.deleted_at)
                        : null,
                },
            },
        },
    })));
    return {
        data: transformedShipments,
        pagination: {
            current: page,
            limit,
            records: total,
            pages: Math.ceil(total / limit),
        },
    };
}
