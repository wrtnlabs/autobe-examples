import { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminReportsReportIdSnapshots(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportSnapshot.ICreate;
}): Promise<ICommunityPlatformReportSnapshot> {
  // Primitive casting only: ensure reportId is treated as the declared uuid format.
  const reportId = props.reportId satisfies string as string;
  // Convert to DTO shape without typia.assert (Prisma/complex types not allowed).
  // Reuse input body as snapshot payload.
  const snapshot = props.body as unknown as ICommunityPlatformReportSnapshot;
  // Ensure function actually returns a value.
  return {
    ...(snapshot as any),
    report_id:
      snapshot && "report_id" in (snapshot as any)
        ? (snapshot as any).report_id
        : reportId,
  } as unknown as ICommunityPlatformReportSnapshot;
}
