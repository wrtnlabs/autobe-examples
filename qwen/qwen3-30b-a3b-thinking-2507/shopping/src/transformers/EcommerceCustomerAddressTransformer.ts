import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";

export namespace EcommerceCustomerAddressTransformer {
    export type Payload = Prisma.ecommerce_customer_addressesGetPayload<ReturnType<typeof select>>;
    export function select() {
        return {
            select: {
                id: true,
                recipient_name: true,
                phone: true,
                street_address: true,
                city: true,
                state: true,
                postal_code: true,
                country: true,
                is_default: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                customer: EcommerceCustomerAtSummaryTransformer.select(),
                orders: true,
                snapshots: true,
            } satisfies Prisma.ecommerce_customer_addressesFindManyArgs
        };
        export async function transform(input: Payload): Promise<IEcommerceCustomerAddress> {
            return {
                id: input.id,
                recipient_name: input.recipient_name,
                phone: input.phone,
                street_address: input.street_address,
                city: input.city,
                state: input.state,
                postal_code: input.postal_code,
                country: input.country,
                is_default: input.is_default,
                created_at: toISOStringSafe(input.created_at),
                updated_at: toISOStringSafe(input.updated_at),
                customer: await EcommerceCustomerAtSummaryTransformer.transform(input.customer),
                deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
            };
        }
    }
}