import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceAdministratorGradeTransformer } from "../transformers/EcommerceAdministratorGradeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminGradesAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IEcommerceAdministratorGrade> {
  const record =
    await MyGlobal.prisma.ecommerce_administrator_grades.findFirstOrThrow({
      where: {
        ecommerce_admin_id: props.adminId,
        deleted_at: null,
      },
      ...EcommerceAdministratorGradeTransformer.select(),
    });
  return await EcommerceAdministratorGradeTransformer.transform(record);
}
