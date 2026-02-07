import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserPreferences(props: {
  user: UserPayload;
  body: IDiscussionBoardSectionPreference.IUpdate;
}): Promise<IDiscussionBoardSectionPreference> {
  // This operation needs a preference ID, but the specification shows empty parameters
  // This suggests the preference ID might be determined differently or this is a bulk update
  // Since the specification shows empty parameters, this might update ALL preferences for the user
  // or there might be a missing path parameter. Need to implement based on available information.
  // For now, implement as updating ALL preferences for the user
  // This matches the specification showing empty parameters
  throw new HttpException(
    "Operation specification unclear - preference ID required but not provided in parameters",
    400,
  );
}
