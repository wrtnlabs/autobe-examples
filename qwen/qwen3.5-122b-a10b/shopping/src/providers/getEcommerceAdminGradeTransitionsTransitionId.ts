import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdminGradeTransition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminGradeTransition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceAdminGradeTransitionTransformer } from "../transformers/EcommerceAdminGradeTransitionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminGradeTransitionsTransitionId(props: {
  admin: AdminPayload;
  transitionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceAdminGradeTransition> {
  const record =
    await MyGlobal.prisma.ecommerce_admin_grade_transitions.findUniqueOrThrow({
      where: { id: props.transitionId },
      ...EcommerceAdminGradeTransitionTransformer.select(),
    });
  return await EcommerceAdminGradeTransitionTransformer.transform(record);
}
