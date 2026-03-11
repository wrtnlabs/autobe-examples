import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoDataRetentionPolicy";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoDataRetentionPolicyCollector } from "../collectors/MultiUserTodoDataRetentionPolicyCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoDataRetentionPolicyTransformer } from "../transformers/MultiUserTodoDataRetentionPolicyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAdminDataRetentionPolicies(props: {
  admin: AdminPayload;
  body: IMultiUserTodoDataRetentionPolicy.ICreate;
}): Promise<IMultiUserTodoDataRetentionPolicy> {
  // The admin payload is already validated by AdminAuth decorator
  // Use the Collector to transform request body into database input
  const created =
    await MyGlobal.prisma.multi_user_todo_data_retention_policies.create({
      data: await MultiUserTodoDataRetentionPolicyCollector.collect({
        body: props.body,
      }),
      ...MultiUserTodoDataRetentionPolicyTransformer.select(),
    });
  // Transform the database record to response DTO
  return await MultiUserTodoDataRetentionPolicyTransformer.transform(created);
}
