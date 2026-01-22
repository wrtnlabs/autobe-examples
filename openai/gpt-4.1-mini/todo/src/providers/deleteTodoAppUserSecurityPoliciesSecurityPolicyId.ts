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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserSecurityPoliciesSecurityPolicyId(props: {
  user: UserPayload;
  securityPolicyId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    await MyGlobal.prisma.todo_app_security_policies.delete({
      where: {
        id: props.securityPolicyId,
      },
    });
  } catch (error) {
    // If record not found, throw 404
    if (
      error instanceof Error &&
      "code" in error &&
      (error as any).code === "P2025"
    ) {
      throw new HttpException("Security policy not found", 404);
    }
    throw error;
  }
}
