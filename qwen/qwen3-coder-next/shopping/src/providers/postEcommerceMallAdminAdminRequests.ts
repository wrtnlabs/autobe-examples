import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallAdminRequestCollector } from "../collectors/EcommerceMallAdminRequestCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminRequestTransformer } from "../transformers/EcommerceMallAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminAdminRequests(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminRequest.ICreate;
}): Promise<IEcommerceMallAdminRequest> {
  // Verify user is not already an admin
  const adminCheck = await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
    where: { id: props.admin.id },
    select: { id: true },
  });
  if (adminCheck !== null) {
    throw new HttpException("Admins cannot submit admin requests", 403);
  }
  // Check for existing pending admin request
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findUnique({
      where: {
        user_id: props.admin.id,
        status: "pending",
      },
      select: { id: true },
    });
  if (existingRequest !== null) {
    throw new HttpException("User already has a pending admin request", 409);
  }
  // Create admin request
  const created = await MyGlobal.prisma.ecommerce_mall_admin_requests.create({
    data: await EcommerceMallAdminRequestCollector.collect({
      body: props.body,
      ecommerceMallCustomers: {
        id: props.admin.id as string & tags.Format<"uuid">,
      } satisfies IEntity,
      ecommerceMallAdmins: null as unknown as IEntity,
    }),
    ...EcommerceMallAdminRequestTransformer.select(),
  });
  return await EcommerceMallAdminRequestTransformer.transform(created);
}
