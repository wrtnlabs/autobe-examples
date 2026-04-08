import { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAdminRequestOfCustomerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        requested_grade: true,
        reason: true,
        status: true,
        reviewed_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reviewer: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.ecommerce_mall_super_adminsFindFirstArgs,
        customer: {
          select: {
            id: true,
            ecommerce_mall_customer_id: true,
            ecommerce_mall_admin_request_id: true,
            customer: {
              select: {
                id: true,
                email: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                profile: {
                  select: {
                    id: true,
                    ecommerce_mall_customer_id: true,
                    display_name: true,
                    phone: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_admin_request_of_customersFindFirstArgs,
        adminRequestOfSeller: {
          select: {
            id: true,
            seller: {
              select: {
                id: true,
              },
            },
            ecommerce_mall_admin_request_id: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_request_of_sellersFindFirstArgs,
      },
    } satisfies Prisma.ecommerce_mall_admin_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRequestOfCustomer.ISummary> {
    // Transform actor based on actor_type
    let actor:
      | IEcommerceMallCustomer.ISummary
      | IEcommerceMallSeller.ISummary
      | undefined = undefined;
    if (input.actor_type === "customer" && input.customer?.customer) {
      const c = input.customer.customer;
      actor = {
        id: c.id,
        email: c.email,
        createdAt: toISOStringSafe(c.created_at),
        updatedAt: toISOStringSafe(c.updated_at),
        deletedAt: c.deleted_at ? toISOStringSafe(c.deleted_at) : null,
        customerProfile: {
          id: c.profile!.id,
          profileType: "customer" as const,
          customerId: c.profile!.ecommerce_mall_customer_id,
          displayName: c.profile!.display_name,
          phone: c.profile!.phone,
          createdAt: toISOStringSafe(c.profile!.created_at),
          updatedAt: toISOStringSafe(c.profile!.updated_at),
        },
      };
    }
    // Transform reviewer (inline)
    const reviewer: IEcommerceMallSuperAdmin.ISummary | undefined =
      input.reviewer
        ? {
            id: input.reviewer.id,
            email: input.reviewer.email,
            createdAt: toISOStringSafe(input.reviewer.created_at),
            updatedAt: toISOStringSafe(input.reviewer.updated_at),
          }
        : undefined;
    return {
      id: input.id,
      actorType: input.actor_type as "customer" | "seller",
      actor: actor,
      reason: input.reason,
      requestedGrade: input.requested_grade as "admin" | "super_admin",
      status: input.status as "approved" | "pending" | "rejected",
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      reviewer: reviewer,
    } satisfies IEcommerceMallAdminRequestOfCustomer.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdminRequestOfCustomerAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_admin_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             actor_type: true,
//             requested_grade: true,
//             reason: true,
//             status: true,
//             reviewed_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             reviewer: EcommerceMallSuperAdminAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_admin_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdminRequestOfCustomer.ISummary> {
//         return {
//   actor: {IEcommerceMallCustomer.ISummary | IEcommerceMallSeller.ISummary},
//   actorType: {"customer" | "seller"},
//   createdAt: {string},
//   id: {string},
//   reason: {string},
//   requestedGrade: {"admin" | "super_admin"},
//   reviewer: await EcommerceMallSuperAdminAtSummaryTransformer.transform(input.reviewer),
//   status: {"approved" | "pending" | "rejected"},
//   updatedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------