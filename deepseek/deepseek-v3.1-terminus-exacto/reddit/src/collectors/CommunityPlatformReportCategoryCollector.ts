import { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformReportCategoryCollector {
  export async function collect(props: {
    body: ICommunityPlatformReportCategory.ICreate;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      display_name: props.body.display_name,
      description: props.body.description,
      severity_level: props.body.severity_level,
      moderation_guidelines: props.body.moderation_guidelines,
      is_active: props.body.is_active ?? true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.community_platform_report_categoriesCreateInput;
  }
}
