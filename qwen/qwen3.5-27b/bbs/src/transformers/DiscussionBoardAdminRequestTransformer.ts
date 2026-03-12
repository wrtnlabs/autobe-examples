import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdminRequestTransformer {
  export type Payload = Prisma.discussion_board_admin_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            email: true,
            display_name: true,
            banned: true,
            created_at: true,
          },
        } satisfies Prisma.discussion_board_membersFindManyArgs,
        reviewingAdministrator: {
          select: {
            id: true,
            email: true,
            display_name: true,
            bio: true,
            grade: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.discussion_board_administratorsFindManyArgs,
        decision: {
          select: {
            id: true,
            decision_type: true,
            decision_context: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            adminRequest: {
              select: {
                id: true,
                member: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    banned: true,
                    created_at: true,
                  },
                } satisfies Prisma.discussion_board_membersFindManyArgs,
                reviewingAdministrator: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    created_at: true,
                    bio: true,
                    grade: true,
                    updated_at: true,
                  },
                } satisfies Prisma.discussion_board_administratorsFindManyArgs,
                reason: true,
                status: true,
                submitted_at: true,
                reviewed_at: true,
              },
            } satisfies Prisma.discussion_board_admin_requestsFindManyArgs,
            reviewer: {
              select: {
                id: true,
                email: true,
                display_name: true,
                created_at: true,
                bio: true,
                grade: true,
                updated_at: true,
              },
            } satisfies Prisma.discussion_board_administratorsFindManyArgs,
          },
        } satisfies Prisma.discussion_board_admin_request_decisionsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_admin_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminRequest> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      submitted_at: toISOStringSafe(input.submitted_at),
      reviewed_at: input.reviewed_at
        ? toISOStringSafe(input.reviewed_at)
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      member: {
        id: input.member.id,
        email: input.member.email,
        display_name: input.member.display_name ?? null,
        banned: input.member.banned,
        created_at: input.member.created_at.toISOString(),
      },
      reviewingAdministrator: input.reviewingAdministrator
        ? {
            id: input.reviewingAdministrator.id,
            email: input.reviewingAdministrator.email,
            display_name: input.reviewingAdministrator.display_name ?? null,
            bio: input.reviewingAdministrator.bio ?? null,
            grade: input.reviewingAdministrator.grade,
            created_at: input.reviewingAdministrator.created_at.toISOString(),
            updated_at: input.reviewingAdministrator.updated_at.toISOString(),
          }
        : {
            id: "",
            email: "",
            display_name: null,
            bio: null,
            grade: "",
            created_at: new Date(0).toISOString(),
            updated_at: new Date(0).toISOString(),
          },
      decision: input.decision
        ? {
            id: input.decision.id,
            decision_type: input.decision.decision_type,
            decision_context: input.decision.decision_context,
            created_at: input.decision.created_at.toISOString(),
            updated_at: input.decision.updated_at.toISOString(),
            deleted_at: input.decision.deleted_at?.toISOString() ?? null,
            adminRequest: {
              id: input.decision.adminRequest.id,
              member: {
                id: input.decision.adminRequest.member.id,
                email: input.decision.adminRequest.member.email,
                display_name:
                  input.decision.adminRequest.member.display_name ?? null,
                banned: input.decision.adminRequest.member.banned,
                created_at:
                  input.decision.adminRequest.member.created_at.toISOString(),
              },
              reviewingAdministrator: input.decision.adminRequest
                .reviewingAdministrator
                ? {
                    id: input.decision.adminRequest.reviewingAdministrator.id,
                    email:
                      input.decision.adminRequest.reviewingAdministrator.email,
                    display_name:
                      input.decision.adminRequest.reviewingAdministrator
                        .display_name ?? null,
                    created_at:
                      input.decision.adminRequest.reviewingAdministrator.created_at.toISOString(),
                    bio:
                      input.decision.adminRequest.reviewingAdministrator.bio ??
                      null,
                    grade:
                      input.decision.adminRequest.reviewingAdministrator.grade,
                    updated_at:
                      input.decision.adminRequest.reviewingAdministrator.updated_at.toISOString(),
                  }
                : null,
              reason: input.decision.adminRequest.reason,
              status: input.decision.adminRequest.status,
              submitted_at:
                input.decision.adminRequest.submitted_at.toISOString(),
              reviewed_at: input.decision.adminRequest.reviewed_at
                ? input.decision.adminRequest.reviewed_at.toISOString()
                : null,
            },
            reviewer: {
              id: input.decision.reviewer.id,
              email: input.decision.reviewer.email,
              display_name: input.decision.reviewer.display_name ?? null,
              created_at: input.decision.reviewer.created_at.toISOString(),
              bio: input.decision.reviewer.bio ?? null,
              grade: input.decision.reviewer.grade,
              updated_at: input.decision.reviewer.updated_at.toISOString(),
            },
          }
        : {
            id: "",
            decision_type: "",
            decision_context: null,
            created_at: new Date(0).toISOString(),
            updated_at: new Date(0).toISOString(),
            deleted_at: null,
            adminRequest: {
              id: "",
              member: {
                id: "",
                email: "",
                display_name: null,
                banned: false,
                created_at: new Date(0).toISOString(),
              },
              reviewingAdministrator: null,
              reason: "",
              status: "",
              submitted_at: new Date(0).toISOString(),
              reviewed_at: null,
            },
            reviewer: {
              id: "",
              email: "",
              display_name: null,
              created_at: new Date(0).toISOString(),
              bio: null,
              grade: "",
              updated_at: new Date(0).toISOString(),
            },
          },
    };
  }
}
