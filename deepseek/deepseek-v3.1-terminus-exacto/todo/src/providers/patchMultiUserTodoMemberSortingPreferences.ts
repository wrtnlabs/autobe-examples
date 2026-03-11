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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchMultiUserTodoMemberSortingPreferences(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodoSortingPreference.IUpdate;
}): Promise<IMultiUserTodoTodoSortingPreference> {
  // Check if at least one field is being updated
  if (
    props.body.sorting_method === undefined &&
    props.body.sorting_direction === undefined
  ) {
    throw new HttpException("At least one field must be updated", 400);
  }
  // Prepare update data with proper typing
  const updateInput: Prisma.multi_user_todo_todo_sorting_preferencesUpdateInput =
    {
      updated_at: new Date().toISOString(),
    };
  if (props.body.sorting_method !== undefined) {
    updateInput.sorting_method = props.body.sorting_method;
  }
  if (props.body.sorting_direction !== undefined) {
    updateInput.sorting_direction = props.body.sorting_direction;
  }
  // Perform update with transformer select in a single operation
  const updated =
    await MyGlobal.prisma.multi_user_todo_todo_sorting_preferences.update({
      where: {
        multi_user_todo_member_id: props.member.id,
      },
      data: updateInput,
      ...MultiUserTodoTodoSortingPreferenceTransformer.select(),
    });
  return await MultiUserTodoTodoSortingPreferenceTransformer.transform(updated);
}
