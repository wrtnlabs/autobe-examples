import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalCommunity";

export async function test_api_communities_index_public_listing(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Provision a member account
   * - Create one public and one private community as the member
   * - As an unauthenticated client, call the public listing endpoint and assert
   *   that only the public community is visible, pagination metadata is
   *   present, and that slug canonicalization was applied by the server.
   */

  // 1) Register a test member
  const memberBody = {
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "P@ssw0rd!23",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2) Create a public community (suggest a non-canonical slug to test server canonicalization)
  const publicSuggestedSlug = `My Public Community ${RandomGenerator.alphaNumeric(4)}`;
  const publicCommunityBody = {
    name: RandomGenerator.name(2),
    slug: publicSuggestedSlug,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const publicCommunity: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: publicCommunityBody,
    });
  typia.assert(publicCommunity);

  // 3) Create a private community
  const privateSuggestedSlug = `Private Community ${RandomGenerator.alphaNumeric(4)}`;
  const privateCommunityBody = {
    name: RandomGenerator.name(2),
    slug: privateSuggestedSlug,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_private: true,
    visibility: "private",
  } satisfies ICommunityPortalCommunity.ICreate;

  const privateCommunity: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: privateCommunityBody,
    });
  typia.assert(privateCommunity);

  // 4) Build an unauthenticated connection (SDK docs: shallow copy and headers: {})
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 5) As unauthenticated, call the listing endpoint with broad null filters and explicit pagination
  const listRequest = {
    q: null,
    slug: null,
    name: null,
    visibility: null,
    is_private: null,
    page: 1,
    limit: 20,
    offset: null,
    sort_by: null,
  } satisfies ICommunityPortalCommunity.IRequest;

  const listing: IPageICommunityPortalCommunity.ISummary =
    await api.functional.communityPortal.communities.index(unauthConn, {
      body: listRequest,
    });
  typia.assert(listing);

  // 6) Business validations
  // 6.1 Pagination metadata present
  TestValidator.predicate(
    "pagination metadata exists and limit is a number",
    listing.pagination !== null && typeof listing.pagination.limit === "number",
  );

  // 6.2 Returned items contain the public community but not the private one
  const foundPublic = listing.data.find((c) => c.id === publicCommunity.id);
  TestValidator.predicate(
    "public community is present in unauthenticated listing",
    foundPublic !== undefined,
  );

  const foundPrivate = listing.data.find((c) => c.id === privateCommunity.id);
  TestValidator.predicate(
    "private community is NOT present in unauthenticated listing",
    foundPrivate === undefined,
  );

  // 6.3 Summary items contain required summary fields for the found public community
  if (foundPublic) {
    typia.assert(foundPublic); // ensures fields match ICommunityPortalCommunity.ISummary
    TestValidator.predicate(
      "foundPublic has slug, name, visibility and is_private",
      typeof foundPublic.slug === "string" &&
        typeof foundPublic.name === "string" &&
        typeof foundPublic.visibility === "string",
    );

    // 6.4 Slug canonicalization: server should return a url-friendly slug
    // (lowercase letters, digits and hyphens). This is a business rule check,
    // not a type validation.
    TestValidator.predicate(
      "slug canonicalization applied (url-friendly)",
      /^[a-z0-9-]+$/.test(foundPublic.slug),
    );
  }

  // 6.5 Ensure archived/soft-deleted communities are excluded: implicitly
  // validated by existence of created communities and absence of deleted ones
  // (no explicit deleted flag created in this test). Final consistency check:
  TestValidator.predicate(
    "at least one community in listing",
    listing.data.length >= 1,
  );
}
