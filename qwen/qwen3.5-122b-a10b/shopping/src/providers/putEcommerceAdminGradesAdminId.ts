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

export async function putEcommerceAdminGradesAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IEcommerceAdministratorGrade.IUpdate;
}): Promise<IEcommerceAdministratorGrade> {
  // Step 1: Verify requesting admin is super administrator
  const requestingGrade =
    await MyGlobal.prisma.ecommerce_administrator_grades.findUnique({
      where: { ecommerce_admin_id: props.admin.id },
      select: { grade: true, deleted_at: true },
    });
  if (!requestingGrade || requestingGrade.deleted_at !== null) {
    throw new HttpException("Administrator grade record not found", 403);
  }
  if (requestingGrade.grade !== "super") {
    throw new HttpException(
      "Only super administrators can modify administrator grades",
      403,
    );
  }
  // Step 2: Check for self-demotion
  if (props.adminId === props.admin.id && props.body.grade === "regular") {
    throw new HttpException(
      "Super administrators cannot demote themselves",
      400,
    );
  }
  // Step 3: Verify target admin grade record exists and is not soft-deleted
  const targetGrade =
    await MyGlobal.prisma.ecommerce_administrator_grades.findUnique({
      where: { ecommerce_admin_id: props.adminId },
      select: { grade: true, deleted_at: true },
    });
  if (!targetGrade || targetGrade.deleted_at !== null) {
    throw new HttpException("Administrator grade record not found", 404);
  }
  // Step 4: Validate new grade value
  if (
    props.body.grade !== undefined &&
    props.body.grade !== "regular" &&
    props.body.grade !== "super"
  ) {
    throw new HttpException("Grade must be either 'regular' or 'super'", 400);
  }
  const newGrade = props.body.grade ?? targetGrade.grade;
  // Step 5: Check if grade is actually changing
  if (newGrade === targetGrade.grade && props.body.grade === undefined) {
    // No change requested, return current record
    const result =
      await MyGlobal.prisma.ecommerce_administrator_grades.findUniqueOrThrow({
        where: { ecommerce_admin_id: props.adminId },
        ...EcommerceAdministratorGradeTransformer.select(),
      });
    return await EcommerceAdministratorGradeTransformer.transform(result);
  }
  // Step 6: Perform update and create audit trail in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.ecommerce_administrator_grades.update({
      where: { ecommerce_admin_id: props.adminId },
      data: {
        grade: newGrade,
        updated_at: new Date(),
      },
    });
    await tx.ecommerce_admin_grade_transitions.create({
      data: {
        id: v4(),
        ecommerce_admin_id: props.adminId,
        performed_by_admin_id: props.admin.id,
        from_grade: targetGrade.grade,
        to_grade: newGrade,
        changed_at: new Date(),
        created_at: new Date(),
      },
    });
  });
  // Step 7: Fetch and transform the updated record
  const result =
    await MyGlobal.prisma.ecommerce_administrator_grades.findUniqueOrThrow({
      where: { ecommerce_admin_id: props.adminId },
      ...EcommerceAdministratorGradeTransformer.select(),
    });
  return await EcommerceAdministratorGradeTransformer.transform(result);
}
