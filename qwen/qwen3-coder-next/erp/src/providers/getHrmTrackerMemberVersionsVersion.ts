import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerSystemVersion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerSystemVersionTransformer } from "../transformers/HrmTrackerSystemVersionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTrackerMemberVersionsVersion(props: {
  member: MemberPayload;
  version: string;
}): Promise<IHrmTrackerSystemVersion> {
  const record =
    await MyGlobal.prisma.hrm_tracker_system_versions.findUniqueOrThrow({
      where: { version: props.version },
      ...HrmTrackerSystemVersionTransformer.select(),
    });
  return await HrmTrackerSystemVersionTransformer.transform(record);
}
