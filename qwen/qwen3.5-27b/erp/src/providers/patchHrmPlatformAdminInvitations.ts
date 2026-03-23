import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformEmployeeInvitationAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeInvitationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformAdminInvitations(props: {
  admin: AdminPayload;
  body: IHrmPlatformEmployeeInvitation.IRequest;
}): Promise<IPageIHrmPlatformEmployeeInvitation.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const session =
    await MyGlobal.prisma.hrm_platform_admin_sessions.findUniqueOrThrow({
      where: { id: props.admin.session_id },
      select: { admin: { select: { id: true } } },
    });
  const adminId = session.admin.id;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      email: {
        contains: props.body.search,
      },
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.created_at_gte && {
      created_at: {
        gte: new Date(props.body.created_at_gte),
      },
    }),
    ...(props.body.created_at_lte && {
      created_at: {
        lte: new Date(props.body.created_at_lte),
      },
    }),
    ...(props.body.expires_at_gte && {
      expires_at: {
        gte: new Date(props.body.expires_at_gte),
      },
    }),
    ...(props.body.expires_at_lte && {
      expires_at: {
        lte: new Date(props.body.expires_at_lte),
      },
    }),
    ...(props.body.redeemed_at_gte !== undefined &&
      props.body.redeemed_at_gte !== null && {
        redeemed_at: {
          gte: new Date(props.body.redeemed_at_gte),
        },
      }),
    ...(props.body.redeemed_at_lte !== undefined &&
      props.body.redeemed_at_lte !== null && {
        redeemed_at: {
          lte: new Date(props.body.redeemed_at_lte),
        },
      }),
  } satisfies Prisma.hrm_platform_employee_invitationsWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_employee_invitations.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmPlatformEmployeeInvitationAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.hrm_platform_employee_invitations.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformEmployeeInvitationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformEmployeeInvitation.ISummary;
}
