import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoFilterSettingTransformer } from "../transformers/MultiUserTodoTodoFilterSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberFilterSettingsFilterSettingIdSettingValues(props: {
  member: MemberPayload;
  filterSettingId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodoFilterSetting.IRequest;
}): Promise<IMultiUserTodoTodoFilterSetting> {
  // First, verify the filter setting exists and belongs to the authenticated member
  const filterSetting =
    await MyGlobal.prisma.multi_user_todo_todo_filter_settings.findUniqueOrThrow(
      {
        where: {
          id: props.filterSettingId,
          multi_user_todo_member_id: props.member.id,
          deleted_at: null,
        },
      },
    );
  // Prepare update data - only update fields that are provided in the request
  const updateData: any = {
    updated_at: new Date(),
  };
  // Update name if search field is provided (search in IRequest maps to name property)
  if (props.body.search !== undefined) {
    updateData.name = props.body.search;
  }
  // Update filter_type if provided
  if (props.body.filter_type !== undefined) {
    updateData.filter_type = props.body.filter_type;
  }
  // Update is_default if provided
  if (props.body.is_default !== undefined) {
    updateData.is_default = props.body.is_default;
  }
  // If no fields to update, just return the current filter setting
  if (Object.keys(updateData).length === 1) {
    // Only updated_at was added
    // Fetch the complete filter setting with its values
    const existingFilterSetting =
      await MyGlobal.prisma.multi_user_todo_todo_filter_settings.findUniqueOrThrow(
        {
          where: { id: props.filterSettingId },
          ...MultiUserTodoTodoFilterSettingTransformer.select(),
        },
      );
    return await MultiUserTodoTodoFilterSettingTransformer.transform(
      existingFilterSetting,
    );
  }
  // Update the filter setting in a transaction
  const updatedFilterSetting = await MyGlobal.prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Update the main filter setting
      const updated = await tx.multi_user_todo_todo_filter_settings.update({
        where: { id: props.filterSettingId },
        data: updateData,
        ...MultiUserTodoTodoFilterSettingTransformer.select(),
      });
      return updated;
    },
  );
  // Transform and return the updated filter setting
  return await MultiUserTodoTodoFilterSettingTransformer.transform(
    updatedFilterSetting,
  );
}
