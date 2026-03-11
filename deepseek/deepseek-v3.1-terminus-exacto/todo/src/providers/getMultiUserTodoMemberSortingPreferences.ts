import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodoSortingPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoSortingPreference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoSortingPreferenceTransformer } from "../transformers/MultiUserTodoTodoSortingPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberSortingPreferences(props: {
  member: MemberPayload;
}): Promise<IMultiUserTodoTodoSortingPreference> {
  // Find the member's sorting preferences
  const preference =
    await MyGlobal.prisma.multi_user_todo_todo_sorting_preferences.findUnique({
      where: {
        multi_user_todo_member_id: props.member.id,
      },
      ...MultiUserTodoTodoSortingPreferenceTransformer.select(),
    });
  // If member has no preferences, throw 404 as specified
  if (!preference) {
    throw new HttpException(
      "No sorting preferences found for this member",
      404,
    );
  }
  // Return transformed preferences
  return await MultiUserTodoTodoSortingPreferenceTransformer.transform(
    preference,
  );
}
