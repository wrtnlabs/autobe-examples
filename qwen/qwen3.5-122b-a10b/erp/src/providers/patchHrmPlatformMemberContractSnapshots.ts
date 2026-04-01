import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractSnapshot";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContractSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformContractSnapshotTransformer } from "../transformers/HrmPlatformContractSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberContractSnapshots(props: {
  member: MemberPayload;
  body: IHrmPlatformContractSnapshot.IRequest;
}): Promise<IPageIHrmPlatformContractSnapshot.ISummary> {
  // Get the member's organization context through employee relationship
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Member not found in any organization", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_contract_snapshotsWhereInput = {
    contract: {
      employee: {
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        deleted_at: null,
      },
    },
    ...(props.body.contract_id && {
      hrm_platform_contract_id: props.body.contract_id,
    }),
    ...(props.body.employee_id && {
      contract: {
        hrm_platform_employee_id: props.body.employee_id,
      },
    }),
    ...(props.body.start_date_from && {
      start_date: {
        gte: new Date(props.body.start_date_from),
      },
    }),
    ...(props.body.start_date_to && {
      start_date: {
        lte: new Date(props.body.start_date_to),
      },
    }),
    ...(props.body.end_date_from && {
      OR: [
        {
          end_date: {
            gte: new Date(props.body.end_date_from),
          },
        },
        {
          end_date: null,
        },
      ],
    }),
    ...(props.body.end_date_to && {
      end_date: {
        lte: new Date(props.body.end_date_to),
        not: null,
      },
    }),
    ...(props.body.pay_period && {
      pay_period: props.body.pay_period,
    }),
    ...(props.body.notes !== undefined &&
      props.body.notes !== null && {
        notes: {
          contains: props.body.notes,
        },
      }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  };
  const data = await MyGlobal.prisma.hrm_platform_contract_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmPlatformContractSnapshotTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_contract_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformContractSnapshotTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
