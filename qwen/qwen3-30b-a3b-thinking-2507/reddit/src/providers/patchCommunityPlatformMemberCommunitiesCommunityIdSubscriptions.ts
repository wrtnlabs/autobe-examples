import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { MemberPayload } from "../decorators/payload/MemberPayload"
import { CommunityPlatformCommunitySubscriptionTransformer } from "../transformers/CommunityPlatformCommunitySubscriptionTransformer"

nimport;


{
    ICommunityPlatformCommunitySubscription;
}
from;
"@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
nimport;


{
    ICommunityPlatformMember;
}
from;
"@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
nimport;


{
    IEntity;
}
from;
"@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
nimport;


{
    ArrayUtil;
}
from;
"@nestia/e2e";
nimport;


{
    HttpException;
}
from;
"@nestjs/common";
nimport;


{
    Prisma;
}
from;
"@prisma/sdk";
nimport;


jwt;
from;
"jsonwebtoken";
nimport;


typia, { tags };
from;
"typia";
nimport;


{
    v4;
}
from;
"uuid";
n;
nimport;


{
    MyGlobal;
}
from;
"../MyGlobal";
nimport;


{
    MemberPayload;
}
from;
"../decorators/payload/MemberPayload";
nimport;


{
    CommunityPlatformCommunitySubscriptionTransformer;
}
from;
"../transformers/CommunityPlatformCommunitySubscriptionTransformer";
nimport;


{
    PasswordUtil;
}
from;
"../utils/PasswordUtil";
nimport;


{
    toISOStringSafe;
}
from;
"../utils/toISOStringSafe";
n;
nexport;
async function patchCommunityPlatformMemberCommunitiesCommunityIdSubscriptions(props: {}, n, member: MemberPayload, n, communityId: string & tags.Format<"uuid">, n, body: ICommunityPlatformCommunitySubscription.IRequest, n): Promise<ICommunityPlatformCommunitySubscription> { n; const existingSubscription = , n, await, MyGlobal, prisma, community_platform_community_subscriptions, findFirst; ({ n, where: { n, community_id: props.communityId, n, user_id: props.member.id, n, deleted_at: null, n }, n, select: { n, id: true, n, community_id: true, n, user_id: true, n, created_at: true, n, updated_at: true, n, deleted_at: true, n, community: { n, select: { n, id: true, n, name: true, n, description: true, n, icon_url: true, n, created_at: true, n, updated_at: true, n, deleted_at: true, n, owner: true, n }, n }, n, user: { n, select: { n, id: true, n, created_at: true, n, updated_at: true, n }, n }, n }, n }); n; if (props.body.subscribed) {
    n;
    if (!existingSubscription) {
        n;
        const created = , n, await, MyGlobal, prisma, community_platform_community_subscriptions, create;
        ({ n, data: { n, id: v4(), n, community: { n, connect: { id: props.communityId }, n }, n, user: { n, connect: { id: props.member.id }, n }, n, created_at: toISOStringSafe(new Date()), n, updated_at: toISOStringSafe(new Date()), n }, n });
        n;
        const fullCreated = , n, await, MyGlobal, prisma, community_platform_community_subscriptions, findUnique;
        ({ n, where: { id: created.id }, n, ...CommunityPlatformCommunitySubscriptionTransformer.select(), n });
        n;
        return await CommunityPlatformCommunitySubscriptionTransformer.transform(n, fullCreated, n);
        n;
    }
    n;
    return await CommunityPlatformCommunitySubscriptionTransformer.transform(n, existingSubscription, n);
    n;
}
else {
    n;
    if (existingSubscription) {
        n;
        const updated = , n, await, MyGlobal, prisma, community_platform_community_subscriptions, update;
        ({ n, where: { id: existingSubscription.id }, n, data: { n, deleted_at: toISOStringSafe(new Date()), n, updated_at: toISOStringSafe(new Date()), n }, n });
        n;
        const fullUpdated = , n, await, MyGlobal, prisma, community_platform_community_subscriptions, findUnique;
        ({ n, where: { id: updated.id }, n, ...CommunityPlatformCommunitySubscriptionTransformer.select(), n });
        n;
        return await CommunityPlatformCommunitySubscriptionTransformer.transform(n, fullUpdated, n);
        n;
    }
    n;
    throw new HttpException("Not subscribed", 404);
  }
});
} }
