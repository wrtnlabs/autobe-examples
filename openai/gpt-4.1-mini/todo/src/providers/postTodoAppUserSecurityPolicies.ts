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
import { TodoAppSecurityPolicyCollector } from "../collectors/TodoAppSecurityPolicyCollector";
import { TodoAppSecurityPolicyTransformer } from "../transformers/TodoAppSecurityPolicyTransformer";

export async function postTodoAppUserSecurityPolicies(props: {
  user: UserPayload;
  body: ITodoAppSecurityPolicy.ICreate;
}): Promise<ITodoAppSecurityPolicy> {
  const createInput = await TodoAppSecurityPolicyCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.todo_app_security_policies.create({
    data: createInput,
    ...TodoAppSecurityPolicyTransformer.select(),
  });
  return await TodoAppSecurityPolicyTransformer.transform(created);
}
