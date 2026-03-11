import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminAtSummaryTransformer } from "../transformers/EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAdminRequestsAdminRequestIdSellerRequest(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminRequestRequestOfSeller> {
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findUniqueOrThrow(
      {
        where: {
          id: props.adminRequestId,
          deleted_at: null,
        },
        select: {
          id: true,
          reason: true,
          request_status: true,
          created_at: true,
          updated_at: true,
          admin: {
            select: {
              id: true,
              email: true,
              is_banned: true,
              ban_reason: true,
              created_at: true,
              updated_at: true,
            },
          },
          sellerRequests: {
            select: {
              seller: {
                select: {
                  id: true,
                  email: true,
                  approval_status: true,
                  rejection_reason: true,
                  is_suspended: true,
                  is_banned: true,
                  created_at: true,
                  updated_at: true,
                },
              },
            },
          },
        },
      },
    );
  if (!request.sellerRequests) {
    throw new HttpException("Admin request not associated with seller", 404);
  }
  const seller = await EcommerceMallSellerAtSummaryTransformer.transform(
    request.sellerRequests.seller,
  );
  const admin = await EcommerceMallAdminAtSummaryTransformer.transform(
    request.admin,
  );
  return {
    id: request.id,
    reason: request.reason,
    request_status: request.request_status,
    admin,
    seller,
    sellerProfile: undefined as any,
    created_at: toISOStringSafe(request.created_at),
    updated_at: toISOStringSafe(request.updated_at),
  } satisfies IEcommerceMallAdminRequestRequestOfSeller;
}
