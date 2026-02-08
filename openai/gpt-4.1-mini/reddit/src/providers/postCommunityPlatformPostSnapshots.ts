import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformPostSnapshots(props: {
  body: ICommunityPlatformPostSnapshot.ICreate;
}): Promise<ICommunityPlatformPostSnapshot> {
  // We need the postId from props.body to verify the post exists.
  // Since ICommunityPlatformPostSnapshot.ICreate is empty, it lacks required fields.
  // Unable to proceed without critical data.
  // Therefore throwing HttpException with 400 Bad Request for missing data.
  throw new HttpException(
    "Missing required post snapshot data in request body",
    400,
  );
}
