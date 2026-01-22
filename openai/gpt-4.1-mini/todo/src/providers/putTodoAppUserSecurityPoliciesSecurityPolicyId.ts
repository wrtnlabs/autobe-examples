import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppSecurityPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSecurityPolicy";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppSecurityPolicyTransformer } from "../transformers/TodoAppSecurityPolicyTransformer";

export async function putTodoAppUserSecurityPoliciesSecurityPolicyId(props: {
  user: UserPayload;
  securityPolicyId: string & tags.Format<"uuid">;
  body: ITodoAppSecurityPolicy.IUpdate;
}): Promise<ITodoAppSecurityPolicy> {
  const existing = await MyGlobal.prisma.todo_app_security_policies.findUnique({
    where: { id: props.securityPolicyId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Security policy not found", 404);
  }
  const updated = await MyGlobal.prisma.todo_app_security_policies.update({
    where: { id: props.securityPolicyId },
    data: {
      ...(props.body.key !== undefined && { key: props.body.key }),
      ...(props.body.value !== undefined && { value: props.body.value }),
      description:
        props.body.description === undefined
          ? existing.description
          : props.body.description === null
            ? null
            : props.body.description,
      ...(props.body.active !== undefined && { active: props.body.active }),
      created_at:
        props.body.created_at === undefined
          ? existing.created_at
          : props.body.created_at === null
            ? undefined
            : typeof props.body.created_at === "string"
              ? props.body.created_at
              : toISOStringSafe(props.body.created_at),
      updated_at: toISOStringSafe(new Date()),
      deleted_at:
        props.body.deleted_at === undefined
          ? existing.deleted_at
          : props.body.deleted_at === null
            ? undefined
            : typeof props.body.deleted_at === "string"
              ? props.body.deleted_at
              : toISOStringSafe(props.body.deleted_at),
    },
  });
  return TodoAppSecurityPolicyTransformer.transform(updated);
}
