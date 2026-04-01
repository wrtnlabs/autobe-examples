import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContract";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingContractAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingMemberContracts(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingContract.IRequest;
}): Promise<IPageIErpHrmTimeTrackingContract.ISummary> {
  const page = props.body.page === undefined ? 1 : props.body.page;
  const limit = props.body.limit === undefined ? 100 : props.body.limit;
  const skip = (page - 1) * limit;
  const includeDeleted = props.body.includeDeleted === true;
  const memberContracts =
    await MyGlobal.prisma.erp_hrm_time_tracking_contracts.findMany({
      where: {
        erp_hrm_time_tracking_employee_id: props.member.id,
        ...(includeDeleted ? {} : { deleted_at: null }),
      },
      select: {
        erp_hrm_time_tracking_organization_id: true,
      },
      distinct: ["erp_hrm_time_tracking_organization_id"],
      take: 2,
      orderBy: {
        created_at: "desc",
      },
    });
  if (memberContracts.length !== 1) {
    throw new HttpException("Missing or ambiguous organization context", 403);
  }
  const selectedOrganizationId =
    memberContracts[0].erp_hrm_time_tracking_organization_id;
  const hasWorkTermStartFrom = props.body.workTermStartDateFrom !== undefined;
  const hasWorkTermStartTo = props.body.workTermStartDateTo !== undefined;
  const hasWorkTermEndFrom = props.body.workTermEndDateFrom !== undefined;
  const hasWorkTermEndTo = props.body.workTermEndDateTo !== undefined;
  if (
    hasWorkTermStartFrom ||
    hasWorkTermStartTo ||
    hasWorkTermEndFrom ||
    hasWorkTermEndTo
  ) {
    throw new HttpException(
      "work term datetime range filters are not supported in this implementation",
      400,
    );
  }
  const where: Prisma.erp_hrm_time_tracking_contractsWhereInput = {
    erp_hrm_time_tracking_organization_id: selectedOrganizationId,
    erp_hrm_time_tracking_employee_id: props.member.id,
    ...(includeDeleted ? {} : { deleted_at: null }),
    ...(props.body.contractNumber === undefined
      ? {}
      : {
          contract_number: {
            contains: props.body.contractNumber,
            mode: "insensitive",
          },
        }),
    ...(props.body.contractTitle === undefined
      ? {}
      : {
          contract_title: {
            contains: props.body.contractTitle,
            mode: "insensitive",
          },
        }),
    ...(props.body.status === undefined ? {} : { status: props.body.status }),
  };
  const sortBy = props.body.sortBy;
  const sortDirection = props.body.sortDirection === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.erp_hrm_time_tracking_contractsOrderByWithRelationInput[] =
    sortBy === undefined
      ? ([
          { created_at: "desc" },
          { id: "desc" },
        ] satisfies Prisma.erp_hrm_time_tracking_contractsOrderByWithRelationInput[])
      : (() => {
          const mapped: Prisma.erp_hrm_time_tracking_contractsOrderByWithRelationInput =
            sortBy === "created_at"
              ? ({
                  created_at: sortDirection,
                } satisfies Prisma.erp_hrm_time_tracking_contractsOrderByWithRelationInput)
              : sortBy === "updated_at"
                ? ({
                    updated_at: sortDirection,
                  } satisfies Prisma.erp_hrm_time_tracking_contractsOrderByWithRelationInput)
                : sortBy === "work_term_start_date"
                  ? ({
                      work_term_start_date: sortDirection,
                    } satisfies Prisma.erp_hrm_time_tracking_contractsOrderByWithRelationInput)
                  : sortBy === "work_term_end_date"
                    ? ({
                        work_term_end_date: sortDirection,
                      } satisfies Prisma.erp_hrm_time_tracking_contractsOrderByWithRelationInput)
                    : sortBy === "status"
                      ? ({
                          status: sortDirection,
                        } satisfies Prisma.erp_hrm_time_tracking_contractsOrderByWithRelationInput)
                      : sortBy === "contract_number"
                        ? ({
                            contract_number: sortDirection,
                          } satisfies Prisma.erp_hrm_time_tracking_contractsOrderByWithRelationInput)
                        : sortBy === "contract_title"
                          ? ({
                              contract_title: sortDirection,
                            } satisfies Prisma.erp_hrm_time_tracking_contractsOrderByWithRelationInput)
                          : ({
                              created_at: "desc",
                            } satisfies Prisma.erp_hrm_time_tracking_contractsOrderByWithRelationInput);
          const tie: Prisma.erp_hrm_time_tracking_contractsOrderByWithRelationInput =
            { id: "desc" };
          return [mapped, tie];
        })();
  const [records, items] = await Promise.all([
    MyGlobal.prisma.erp_hrm_time_tracking_contracts.count({ where }),
    MyGlobal.prisma.erp_hrm_time_tracking_contracts.findMany({
      where,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ErpHrmTimeTrackingContractAtSummaryTransformer.select(),
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      items,
      ErpHrmTimeTrackingContractAtSummaryTransformer.transform,
    ),
  };
}
