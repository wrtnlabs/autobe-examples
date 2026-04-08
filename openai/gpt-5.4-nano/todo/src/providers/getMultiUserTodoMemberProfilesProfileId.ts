import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoUserProfileTransformer } from "../transformers/MultiUserTodoUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberProfilesProfileId(props: {
  member: MemberPayload;
  profileId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoUserProfile> {
  const record =
    await MyGlobal.prisma.multi_user_todo_user_profiles.findFirstOrThrow({
      where: {
        id: props.profileId,
        deleted_at: null,
      },
      ...MultiUserTodoUserProfileTransformer.select(),
    });
  if (record.multi_user_todo_user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await MultiUserTodoUserProfileTransformer.transform(record);
}
