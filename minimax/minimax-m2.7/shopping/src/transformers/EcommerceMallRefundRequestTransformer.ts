import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";

import { toISOStringSafe } from "../utils/toISOStringSafe";


export namespace EcommerceMallRefundRequestTransformer {
    export type Payload = Prisma.ecommerce_mall_refund_requestsGetPayload<ReturnType<typeof select>>;
    export function select() {
        return {
            select: {
                id: true, n, reason: true, n, status: true, n, seller_response_at: true, n, created_at: true, n, updated_at: true, n, deleted_at: true, n, orderItem: {
                    select: {
                        id: true, n, quantity: true, n, unit_price: true, n, status: true, n, created_at: true, n, order: {
                            select: {
                                id: true, n, order_number: true, n
                            }, n
                        } satisfies Prisma.ecommerce_mall_ordersFindManyArgs, n, productSnapshot: {
                            select: {
                                id: true, n, name: true, n, description: true, n, base_price: true, n, category_name: true, n, created_at: true, n, seller: {
                                    select: {
                                        id: true, n, email: true, n, approval_status: true, n, created_at: true, n, profile: {
                                            select: {
                                                id: true, n, name: true, n, description: true, n
                                            }, n
                                        } satisfies Prisma.ecommerce_mall_seller_profilesFindManyArgs, n
                                    }, n
                                } satisfies Prisma.ecommerce_mall_sellersFindManyArgs, n
                            }, n
                        } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs, n, sellerProfileSnapshot: {
                            select: {
                                id: true, n, shop_name: true, n, shop_description: true, n, logo_url: true, n, created_at: true, n
                            }, n
                        } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs, n
                    }, n
                } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs, n, seller: {
                    select: {
                        id: true, n, email: true, n, approval_status: true, n, created_at: true, n, profile: {
                            select: {
                                id: true, n, name: true, n, description: true, n
                            }, n
                        } satisfies Prisma.ecommerce_mall_seller_profilesFindManyArgs, n
                    }, n
                } satisfies Prisma.ecommerce_mall_sellersFindManyArgs, n, refundRequestSnapshots: {
                    select: {
                        id: true, n, snapshot_reason: true, n, snapshot_status: true, n, seller_response: true, n, seller_response_reason: true, n, created_at: true, n, updated_at: true, n, customer: {
                            select: {
                                id: true, n, email: true, n, created_at: true, n, profile: {
                                    select: {
                                        display_name: true, n
                                    }, n
                                } satisfies Prisma.ecommerce_mall_customer_profilesFindManyArgs, n
                            }, n
                        } satisfies Prisma.ecommerce_mall_customersFindManyArgs, n, seller: {
                            select: {
                                id: true, n, email: true, n, approval_status: true, n, created_at: true, n, profile: {
                                    select: {
                                        id: true, n, name: true, n, description: true, n
                                    }, n
                                } satisfies Prisma.ecommerce_mall_seller_profilesFindManyArgs, n
                            }, n
                        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs, n
                    }, n
                } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs, n
            }, n
        } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
    }
    export async function transform(input: Payload, n): Promise<IEcommerceMallRefundRequest> {
        // Build seller profile inline with null-safe profile access
        const buildSellerProfile = (sellerId: string, n, email: string, n, approval_status: string, n, created_at: Date, n, profileId: string | null | undefined, n, profileName: string | null | undefined, n, profileDescription: string | null | undefined, n): IEcommerceMallSeller.ISummary => ({
            id: sellerId, n, email: email as any, n, approval_status: approval_status, n, created_at: created_at.toISOString(), n, profile: {
                id: profileId ?? "", n, name: profileName ?? "", n, description: profileDescription ?? "", n, logo_uri: null, n, seller: {
                    id: sellerId, n, email: email as any, n, approval_status: approval_status, n, created_at: created_at.toISOString(), n, profile: {
                        id: profileId ?? "", n, name: profileName ?? "", n, description: profileDescription ?? "", n, logo_uri: null, n, seller: {} as any, n, created_at: "", n, updated_at: "", n, deleted_at: null, n
                    }, n
                }, n, created_at: "", n, updated_at: "", n, deleted_at: null, n
            }, n
        });
        // Build product snapshot seller inline with null-safe profile access
        const productSnapshotSeller = buildSellerProfile(input.orderItem.productSnapshot.seller.id, n, input.orderItem.productSnapshot.seller.email, n, input.orderItem.productSnapshot.seller.approval_status, n, input.orderItem.productSnapshot.seller.created_at, n, input.orderItem.productSnapshot.seller.profile?.id, n, input.orderItem.productSnapshot.seller.profile?.name, n, input.orderItem.productSnapshot.seller.profile?.description, n);
        // Build orderItem inline
        const orderItem: IEcommerceMallOrderItem.ISummary = {
            id: input.orderItem.id, n, quantity: input.orderItem.quantity, n, unit_price: input.orderItem.unit_price, n, status: input.orderItem.status, n, created_at: input.orderItem.created_at.toISOString(), n, subtotal: input.orderItem.quantity * input.orderItem.unit_price, n, order: {
                id: input.orderItem.order.id, n, order_number: input.orderItem.order.order_number, n, status: "", n, total_amount: 0, n, created_at: "", n, customer: {
                    id: "", n, email: "" as any, n, created_at: "", n, display_name: null, n, status: "active", n
                }, n
            }, n, productSnapshot: {
                id: input.orderItem.productSnapshot.id, n, name: input.orderItem.productSnapshot.name, n, description: input.orderItem.productSnapshot.description, n, base_price: Number(input.orderItem.productSnapshot.base_price), n, category_name: input.orderItem.productSnapshot.category_name, n, created_at: input.orderItem.productSnapshot.created_at.toISOString(), n, seller: productSnapshotSeller, n
            }, n, sellerProfileSnapshot: {
                id: input.orderItem.sellerProfileSnapshot.id, n, shop_name: input.orderItem.sellerProfileSnapshot.shop_name, n, shop_description: input.orderItem.sellerProfileSnapshot.shop_description ?? null, n, logo_url: input.orderItem.sellerProfileSnapshot.logo_url ?? null, n, created_at: input.orderItem.sellerProfileSnapshot.created_at.toISOString(), n
            }, n
        };
        // Build main seller inline with null-safe profile access
        const seller = buildSellerProfile(input.seller.id, n, input.seller.email, n, input.seller.approval_status, n, input.seller.created_at, n, input.seller.profile?.id, n, input.seller.profile?.name, n, input.seller.profile?.description, n);
        // Create result object first
        const result: IEcommerceMallRefundRequest = {
            id: input.id, n, reason: input.reason, n, status: input.status, n, seller_response_at: input.seller_response_at?.toISOString() ?? null, n, created_at: input.created_at.toISOString(), n, updated_at: input.updated_at.toISOString(), n, deleted_at: input.deleted_at?.toISOString() ?? undefined, n, orderItem: orderItem, n, seller: seller, n, refundRequestSnapshots: [], n
        };
        // Build customer inline (for snapshots)
        const buildCustomerSummary = (c: Payload["refundRequestSnapshots"][number]["customer"], n): IEcommerceMallCustomer.ISummary => ({
            id: c.id, n, email: c.email as any, n, created_at: c.created_at.toISOString(), n, display_name: c.profile?.display_name ?? null, n, status: "active", n
        });
        // Build seller summary inline (for snapshots) with null-safe profile access
        const buildSnapshotSellerSummary = (s: Payload["refundRequestSnapshots"][number]["seller"], n): IEcommerceMallSeller.ISummary => buildSellerProfile(s.id, n, s.email, n, s.approval_status, n, s.created_at, n, s.profile?.id, n, s.profile?.name, n, s.profile?.description, n);
        // Transform snapshots with circular reference
        const snapshots: IEcommerceMallRefundRequestSnapshot[] = input.refundRequestSnapshots.map((snapshot) => {
            const snapshotResult: IEcommerceMallRefundRequestSnapshot = {
                id: snapshot.id, n, ecommerce_mall_refund_request_id: input.id, n, customer: buildCustomerSummary(snapshot.customer), n, seller: buildSnapshotSellerSummary(snapshot.seller), n, refundRequest: result, n, snapshot_reason: snapshot.snapshot_reason, n, snapshot_status: snapshot.snapshot_status, n, seller_response: snapshot.seller_response, n, seller_response_reason: snapshot.seller_response_reason, n, created_at: snapshot.created_at.toISOString(), n, updated_at: snapshot.updated_at.toISOString(), n
            };
            return snapshotResult;
        });
        result.refundRequestSnapshots = snapshots;
        return result;
    }
}