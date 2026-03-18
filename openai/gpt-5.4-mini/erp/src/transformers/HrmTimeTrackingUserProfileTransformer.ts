import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { IHrmTimeTrackingUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackingUserProfileTransformer {
  export type Payload = Prisma.hrm_time_tracking_user_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        userAccount: {
          select: {},
        },
        display_name: true,
        avatar_image_url: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingUserProfile> {
    const deletedAt: string | null =
      input.deleted_at !== null && input.deleted_at !== undefined
        ? toISOStringSafe(input.deleted_at)
        : null;
    return {
      id: input.id,
      userAccount: {} satisfies IHrmTimeTrackingUserAccount.ISummary,
      displayName: input.display_name,
      avatarImageUrl: null,
      phoneNumber: input.phone_number ?? null,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: deletedAt,
    };
  }
}
