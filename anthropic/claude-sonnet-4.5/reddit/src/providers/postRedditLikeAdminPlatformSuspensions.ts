import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditLikeAdminPlatformSuspensions(props: {
  admin: AdminPayload;
  body: IRedditLikePlatformSuspension.ICreate;
}): Promise<IRedditLikePlatformSuspension> {
  const { admin, body } = props;

  const now = toISOStringSafe(new Date());
  const suspensionId = v4() as string & tags.Format<"uuid">;
  const preparedExpirationDate = body.expiration_date
    ? toISOStringSafe(new Date(body.expiration_date))
    : undefined;

  const created = await MyGlobal.prisma.reddit_like_platform_suspensions.create(
    {
      data: {
        id: suspensionId,
        suspended_member_id: body.suspended_member_id,
        admin_id: admin.id,
        suspension_reason_category: body.suspension_reason_category,
        suspension_reason_text: body.suspension_reason_text,
        internal_notes: body.internal_notes ?? undefined,
        is_permanent: body.is_permanent,
        expiration_date: preparedExpirationDate,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    },
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    suspended_member_id: created.suspended_member_id as string &
      tags.Format<"uuid">,
    suspension_reason_category: created.suspension_reason_category,
    suspension_reason_text: created.suspension_reason_text,
    is_permanent: created.is_permanent,
    expiration_date: preparedExpirationDate,
    is_active: created.is_active,
    created_at: now,
  };
}
