import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAnnouncement";
import { IRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAnnouncement";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneGuestAnnouncements(props: {
  guest: GuestPayload;
  body: IRedditCloneAnnouncement.IRequest;
}): Promise<IPageIRedditCloneAnnouncement.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: 0,
      pages: 0,
    } satisfies IPage.IPagination,
    data: [],
  };
}
