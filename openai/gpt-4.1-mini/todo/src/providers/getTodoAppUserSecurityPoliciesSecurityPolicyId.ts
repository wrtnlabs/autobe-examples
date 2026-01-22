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

export async function getTodoAppUserSecurityPoliciesSecurityPolicyId(props: {
  user: UserPayload;
  securityPolicyId: string & tags.Format<"uuid">;
}): Promise<ITodoAppSecurityPolicy> {
  const securityPolicy =
    await MyGlobal.prisma.todo_app_security_policies.findUnique({
      where: { id: props.securityPolicyId },
      ...TodoAppSecurityPolicyTransformer.select(),
    });
  if (!securityPolicy || securityPolicy.deleted_at !== null) {
    throw new HttpException("Security policy not found", 404);
  }
  return await TodoAppSecurityPolicyTransformer.transform(securityPolicy);
}
