import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicDiscussionCitizenProfile(props: {
  citizen: CitizenPayload;
  body: IEconomicDiscussionCitizen.IUpdate;
}): Promise<IEconomicDiscussionCitizen> {
  // Verify user is an active citizen
  const citizen = await MyGlobal.prisma.economic_discussion_citizens.findUnique(
    {
      where: {
        id: props.citizen.id,
      },
    },
  );
  if (!citizen) {
    throw new HttpException(
      "You're not enrolled or your account is inactive",
      403,
    );
  }
  // Update the profile
  const updated = await MyGlobal.prisma.economic_discussion_citizens.update({
    where: {
      id: props.citizen.id,
    },
    data: {
      display_name: props.body.display_name,
      bio: props.body.bio,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return the updated profile with required fields
  return {
    display_name: updated.display_name,
    bio: updated.bio !== null ? updated.bio : "",
    articles: [],
    comments: [],
  };
}
