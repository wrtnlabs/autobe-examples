import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoDataRetentionPolicy";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoDataRetentionPolicyTransformer } from "../transformers/MultiUserTodoDataRetentionPolicyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoAdminDataRetentionPoliciesPolicyId(props: {
  admin: AdminPayload;
  policyId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoDataRetentionPolicy> {
  const policy =
    await MyGlobal.prisma.multi_user_todo_data_retention_policies.findUniqueOrThrow(
      {
        where: { id: props.policyId },
        ...MultiUserTodoDataRetentionPolicyTransformer.select(),
      },
    );
  return await MultiUserTodoDataRetentionPolicyTransformer.transform(policy);
}
