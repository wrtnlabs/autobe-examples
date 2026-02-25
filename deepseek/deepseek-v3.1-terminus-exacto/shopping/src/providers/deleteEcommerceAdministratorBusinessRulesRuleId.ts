import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceAdministratorBusinessRulesRuleId(props: {
  administrator: AdministratorPayload;
  ruleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check rule exists and is active
  const rule = await MyGlobal.prisma.ecommerce_business_rules.findFirstOrThrow({
    where: {
      id: props.ruleId,
      deleted_at: null,
    },
  });
  const now = toISOStringSafe(new Date());
  // Soft delete with current timestamp
  await MyGlobal.prisma.ecommerce_business_rules.update({
    where: { id: props.ruleId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Note: Audit logging would be handled by separate system
  // according to specification
}
