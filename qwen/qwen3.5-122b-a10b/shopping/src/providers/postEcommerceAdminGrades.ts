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
import { EcommerceAdministratorGradeCollector } from "../collectors/EcommerceAdministratorGradeCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceAdministratorGradeTransformer } from "../transformers/EcommerceAdministratorGradeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdminGrades(props: {
  admin: AdminPayload;
  body: IEcommerceAdministratorGrade.ICreate;
}): Promise<IEcommerceAdministratorGrade> {
  // 1. Authorization Check - Verify requesting admin has super grade
  const requestingGrade =
    await MyGlobal.prisma.ecommerce_administrator_grades.findUnique({
      where: { ecommerce_admin_id: props.admin.id },
      select: { grade: true, deleted_at: true },
    });
  if (requestingGrade === null || requestingGrade.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (requestingGrade.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Validate Target Admin Exists and Not Deleted
  const targetAdmin = await MyGlobal.prisma.ecommerce_admins.findUnique({
    where: { id: props.body.ecommerce_admin_id },
    select: { id: true, deleted_at: true },
  });
  if (targetAdmin === null) {
    throw new HttpException("Not Found", 404);
  }
  if (targetAdmin.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // 3. Check Target Admin Doesn't Already Have Active Grade Assignment
  const existingGrade =
    await MyGlobal.prisma.ecommerce_administrator_grades.findUnique({
      where: { ecommerce_admin_id: props.body.ecommerce_admin_id },
      select: { id: true, deleted_at: true },
    });
  if (existingGrade !== null && existingGrade.deleted_at === null) {
    throw new HttpException("Conflict", 409);
  }
  // 4. Create Grade Assignment
  const record = await MyGlobal.prisma.ecommerce_administrator_grades.create({
    data: await EcommerceAdministratorGradeCollector.collect({
      body: props.body,
    }),
    ...EcommerceAdministratorGradeTransformer.select(),
  });
  // 5. Return Transformed Response
  return await EcommerceAdministratorGradeTransformer.transform(record);
}
