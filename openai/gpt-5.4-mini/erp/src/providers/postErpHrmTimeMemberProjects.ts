import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeProjectCollector } from "../collectors/ErpHrmTimeProjectCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeProjectTransformer } from "../transformers/ErpHrmTimeProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberProjects(props: {
  member: MemberPayload;
  body: IErpHrmTimeProject.ICreate;
}): Promise<IErpHrmTimeProject> {
  const organization = (
    props.member as unknown as {
      organization: IEntity | null;
    }
  ).organization;
  if (organization === null || organization === undefined) {
    throw new HttpException("Organization context is missing", 400);
  }
  try {
    const created = await MyGlobal.prisma.erp_hrm_time_projects.create({
      data: await ErpHrmTimeProjectCollector.collect({
        body: props.body,
        organization,
      }),
      ...ErpHrmTimeProjectTransformer.select(),
    });
    return await ErpHrmTimeProjectTransformer.transform(created);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (
        error as {
          code?: string;
        }
      ).code === "P2002"
    ) {
      throw new HttpException(
        "Project name already exists in this organization",
        400,
      );
    }
    throw error;
  }
}
