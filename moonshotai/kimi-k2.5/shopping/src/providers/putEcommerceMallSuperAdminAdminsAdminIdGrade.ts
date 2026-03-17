import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminTransformer } from "../transformers/EcommerceMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSuperAdminAdminsAdminIdGrade(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdmin.IUpdateGrade;
}): Promise<IEcommerceMallAdmin> {
  // Self-demotion prevention: super admins cannot demote themselves
  if (props.superAdmin.id === props.adminId && props.body.grade === "regular") {
    throw new HttpException(
      "Super administrators cannot demote themselves",
      403,
    );
  }
  // Verify target admin exists and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_admins.findFirstOrThrow({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
  // Update the admin's grade
  await MyGlobal.prisma.ecommerce_mall_admins.update({
    where: { id: props.adminId },
    data: {
      grade: props.body.grade,
      updated_at: new Date().toISOString() as unknown as Date,
    },
  });
  // Fetch updated record with full selection
  const updated = await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow(
    {
      where: { id: props.adminId },
      ...EcommerceMallAdminTransformer.select(),
    },
  );
  return await EcommerceMallAdminTransformer.transform(updated);
}
