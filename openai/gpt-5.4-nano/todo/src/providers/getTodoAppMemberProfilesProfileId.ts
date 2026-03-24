import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppUserProfileTransformer } from "../transformers/TodoAppUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberProfilesProfileId(props: {
  member: MemberPayload;
  profileId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserProfile> {
  const profile = await MyGlobal.prisma.todo_app_user_profiles.findFirstOrThrow(
    {
      where: {
        id: props.profileId,
        todo_app_member_id: props.member.id,
        deleted_at: null,
      },
      ...TodoAppUserProfileTransformer.select(),
    },
  );
  return await TodoAppUserProfileTransformer.transform(profile);
}
