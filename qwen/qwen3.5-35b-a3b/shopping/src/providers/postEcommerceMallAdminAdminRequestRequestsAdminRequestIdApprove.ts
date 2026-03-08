import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminRequestRequestTransformer } from "../transformers/EcommerceMallAdminRequestRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminAdminRequestRequestsAdminRequestIdApprove(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminRequestRequest> {
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findUniqueOrThrow(
      {
        where: {
          id: props.adminRequestId,
          deleted_at: null,
          request_status: "pending",
        },
        ...EcommerceMallAdminRequestRequestTransformer.select(),
      },
    );
  const approvedAt: string & tags.Format<"date-time"> =
    new Date().toISOString();
  const [updatedRequest, snapshot] = await MyGlobal.prisma.$transaction(
    async (tx) => {
      const updated = await tx.ecommerce_mall_admin_request_requests.update({
        where: { id: props.adminRequestId },
        data: {
          request_status: "approved",
          updated_at: approvedAt,
        },
        ...EcommerceMallAdminRequestRequestTransformer.select(),
      });
      const newSnapshot =
        await tx.ecommerce_mall_admin_request_snapshots.create({
          data: {
            id: v4(),
            adminRequest: { connect: { id: props.adminRequestId } },
            changed_by: { connect: { id: props.admin.id } },
            reason: request.reason,
            request_status: "approved",
            created_at: request.created_at,
            changed_at: approvedAt,
          },
        });
      return [updated, newSnapshot] as const;
    },
  );
  const requester = request.admin.id;
  await MyGlobal.prisma.ecommerce_mall_admins.upsert({
    where: { id: requester },
    create: {
      id: requester,
      email: "pending@request.approved",
      password_hash: "",
      created_at: approvedAt,
      updated_at: approvedAt,
      is_banned: false,
    },
    update: {
      updated_at: approvedAt,
    },
  });
  return await EcommerceMallAdminRequestRequestTransformer.transform(
    updatedRequest,
  );
}
