import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberProfiles(props: {
  member: MemberPayload;
  body: ICommunityPlatformUserProfile.ICreate;
}): Promise<ICommunityPlatformUserProfile> {
  const createdAtIso = toISOStringSafe(new Date());
  const updatedAtIso = toISOStringSafe(new Date());
  return {
    ...(props.body as unknown as ICommunityPlatformUserProfile),
    ...(typeof (
      props.body as unknown as {
        created_at?: unknown;
      }
    ).created_at !== "undefined"
      ? {
          created_at:
            createdAtIso as unknown as ICommunityPlatformUserProfile["created_at"],
        }
      : null),
    ...(typeof (
      props.body as unknown as {
        updated_at?: unknown;
      }
    ).updated_at !== "undefined"
      ? {
          updated_at:
            updatedAtIso as unknown as ICommunityPlatformUserProfile["updated_at"],
        }
      : null),
  };
}
