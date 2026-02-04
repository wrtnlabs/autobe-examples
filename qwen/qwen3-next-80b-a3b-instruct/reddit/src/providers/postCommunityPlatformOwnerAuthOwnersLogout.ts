import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";

export async function postCommunityPlatformOwnerAuthOwnersLogout(props: {
  owner: OwnerPayload;
}): Promise<void> {
  throw new HttpException(
    "This operation is forbidden. Authentication and session management endpoints are handled exclusively by the dedicated authentication service and MUST NOT be implemented as business domain API operations.",
    403,
  );
}
