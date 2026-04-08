import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackMemberProfile(props: {
  member: MemberPayload;
  body: IHrmTimeTrackUserProfile.IUpdate;
}): Promise<IHrmTimeTrackUserProfile> {
  return typia.random<IHrmTimeTrackUserProfile>();
}
