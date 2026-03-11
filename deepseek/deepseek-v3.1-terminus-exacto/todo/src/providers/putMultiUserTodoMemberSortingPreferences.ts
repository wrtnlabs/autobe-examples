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

export async function putMultiUserTodoMemberSortingPreferences(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodoSortingPreference.IUpdate;
}): Promise<IMultiUserTodoTodoSortingPreference> {
  const existing =
    await MyGlobal.prisma.multi_user_todo_todo_sorting_preferences.findUnique({
      where: { multi_user_todo_member_id: props.member.id },
    });
  const sortingMethod = props.body.sorting_method;
  const sortingDirection = props.body.sorting_direction;
  // Validate sorting method
  if (
    sortingMethod !== undefined &&
    !["creation_date", "start_date", "due_date"].includes(sortingMethod)
  ) {
    throw new HttpException("Invalid sorting method", 400);
  }
  // Validate sorting direction
  if (sortingDirection !== undefined && typeof sortingDirection !== "boolean") {
    throw new HttpException("Invalid sorting direction", 400);
  }
  const updateData = {
    sorting_method: sortingMethod,
    sorting_direction: sortingDirection,
    updated_at: new Date(),
  };
  const upserted =
    await MyGlobal.prisma.multi_user_todo_todo_sorting_preferences.upsert({
      where: { multi_user_todo_member_id: props.member.id },
      update: updateData,
      create: {
        id: v4(),
        multi_user_todo_member_id: props.member.id,
        sorting_method: sortingMethod ?? "creation_date",
        sorting_direction: sortingDirection ?? true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  const updated =
    await MyGlobal.prisma.multi_user_todo_todo_sorting_preferences.findUniqueOrThrow(
      {
        where: { id: upserted.id },
        ...MultiUserTodoTodoSortingPreferenceTransformer.select(),
      },
    );
  return await MultiUserTodoTodoSortingPreferenceTransformer.transform(updated);
}
