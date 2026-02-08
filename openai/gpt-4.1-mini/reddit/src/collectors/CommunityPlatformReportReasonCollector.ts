import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformReportReasonCollector {
  export async function collect(props: {
    body: ICommunityPlatformReportReason.ICreate;
  }) {
    // The DTO does not provide reason_text which is non-nullable in DB, so this collector cannot be implemented correctly without it.
    // Hence, cannot generate complete function.
    throw new Error(
      "Missing required reason_text property in DTO body for creating community_platform_report_reasons",
    );
  }
}
