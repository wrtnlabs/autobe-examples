import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationLogo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsOrganizationLogoTransformer {
  export type Payload = Prisma.hrms_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_uri: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: true,
        memberSessions: true,
        activityLogs: true,
        organizationMembers: true,
        roles: true,
        departments: true,
        projects: true,
        files: true,
        fileUploads: true,
      },
    } satisfies Prisma.hrms_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsOrganizationLogo> {
    return {
      logo_uri: input.logo_uri ?? null,
      organization_id: input.id,
    } satisfies IHrmsOrganizationLogo;
  }
}
