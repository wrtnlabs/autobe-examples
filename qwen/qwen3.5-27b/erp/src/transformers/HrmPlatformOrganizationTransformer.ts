import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformOrganizationLogoTransformer } from "./HrmPlatformOrganizationLogoTransformer";
import { HrmPlatformOrganizationSettingTransformer } from "./HrmPlatformOrganizationSettingTransformer";

export namespace HrmPlatformOrganizationTransformer {
  export type Payload = Prisma.hrm_platform_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: HrmPlatformMemberAtSummaryTransformer.select(),
        setting: HrmPlatformOrganizationSettingTransformer.select(),
        logo: HrmPlatformOrganizationLogoTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformOrganization> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      owner: await HrmPlatformMemberAtSummaryTransformer.transform(input.owner),
      settings: await HrmPlatformOrganizationSettingTransformer.transform(
        input.setting as any,
      ),
      logo: await HrmPlatformOrganizationLogoTransformer.transform(
        input.logo as any,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
