import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformMemberTransformer {
  export type Payload = Prisma.hrm_platform_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        avatar_image: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.hrm_platform_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmPlatformMember> {
    return {
      id: input.id,
      displayName: input.display_name,
      avatarImage: input.avatar_image ?? undefined,
      phoneNumber: input.phone_number ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
