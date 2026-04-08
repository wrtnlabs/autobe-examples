import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";

export namespace HrmPlatformUserProfileTransformer {
  export type Payload = Prisma.hrm_platform_user_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        avatar_url: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformUserProfile> {
    return {
      id: input.id,
      display_name: input.display_name,
      avatar_url: input.avatar_url,
      phone_number: input.phone_number,
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmPlatformUserProfile;
  }
}
