import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBannedUser";
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

nimport;

{
  HttpException;
}
from;
("@nestjs/common");
nimport;

{
  Prisma;
}
from;
("@prisma/sdk");
nimport;

jwt;
from;
("jsonwebtoken");
nimport;

(typia, { tags });
from;
("typia");
nimport;

{
  v4;
}
from;
("uuid");
nimport;

{
  MyGlobal;
}
from;
("../MyGlobal");
nimport;

{
  PasswordUtil;
}
from;
("../utils/PasswordUtil");
nimport;

{
  toISOStringSafe;
}
from;
("../utils/toISOStringSafe");
n;
nimport;

{
  IEntity;
}
from;
("@ORGANIZATION/PROJECT-api/lib/structures/IEntity");
nimport;

{
  ICommunityBannedUser;
}
from;
("@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser");
nimport;

{
  IPageICommunityBannedUser;
}
from;
("@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBannedUser");
nimport;

{
  IPage;
}
from;
("@ORGANIZATION/PROJECT-api/lib/structures/IPage");
nimport;

{
  ICommunityMember;
}
from;
("@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember");
nimport;

{
  ICommunityCommunity;
}
from;
("@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity");
nimport;

{
  AdminPayload;
}
from;
("../decorators/payload/AdminPayload");
nimport;

{
  CommunityBannedUserAtSummaryTransformer;
}
from;
("../transformers/CommunityBannedUserAtSummaryTransformer");
n;
nexport;
async function patchCommunityAdminCommunitiesCommunityIdBans(
  props: {},
  n,
  admin: AdminPayload,
  n,
  communityId: string & tags.Format,
);
