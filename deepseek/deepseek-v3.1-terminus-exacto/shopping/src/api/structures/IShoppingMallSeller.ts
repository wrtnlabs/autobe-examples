import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallSeller {
  /**
   * Seller creation data structure for registering new business accounts on
   * the shopping mall platform.
   *
   * This DTO captures comprehensive business information required for seller
   * registration, including authentication credentials, company details, and
   * contact information. The creation process initiates business verification
   * workflows and establishes the foundation for seller account management.
   *
   * Seller accounts undergo approval processes before gaining full platform
   * access to ensure business authenticity and compliance with platform
   * standards. The registration includes session context fields for audit
   * trail and security monitoring, supporting proper session management from
   * the initial account creation.
   *
   * This is a self-authentication operation where sellers register
   * themselves, requiring comprehensive connection metadata for security
   * analysis and compliance requirements. The operation creates both the
   * seller account and initial session record with proper audit trail
   * information.
   *
   * The DTO validates business information completeness while supporting the
   * platform's security framework through session context tracking and
   * business verification workflows.
   */
  export type ICreate = {
    /**
     * Seller email address used for authentication and business
     * communication. Must be unique across all seller accounts and
     * validated against RFC 5322 email format standards.
     *
     * This email serves as the primary authentication identifier for seller
     * access to the platform dashboard and management tools. Email
     * uniqueness validation prevents duplicate seller registrations and
     * ensures proper account management.
     *
     * The email address is also used for business communication, order
     * notifications, and platform updates related to seller account
     * activities and performance.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password for seller authentication that will be securely
     * hashed before storage using bcrypt algorithm.
     *
     * Password strength requirements are enforced during registration to
     * ensure account security. The password undergoes hashing before being
     * stored in the shopping_mall_sellers.password_hash column for secure
     * authentication.
     *
     * Password validation includes minimum length requirements, character
     * complexity, and common password pattern detection to enhance account
     * security from the initial registration.
     */
    password: string;

    /**
     * Legal business name of the seller for identification and verification
     * purposes. Must be unique across all registered sellers on the
     * platform.
     *
     * The business name is used for storefront display, customer
     * identification, and business verification processes. It represents
     * the official business entity that will be listing products and
     * managing orders.
     *
     * Business name uniqueness validation prevents marketplace confusion
     * and ensures proper seller differentiation for customers browsing the
     * shopping platform.
     */
    business_name: string;

    /**
     * Primary contact person responsible for seller account management and
     * business operations. This individual serves as the main point of
     * contact for platform communications.
     *
     * The contact person information is used for business verification,
     * support communications, and account management interactions. This
     * field helps establish proper business relationships and support
     * workflows.
     *
     * Contact person details are essential for platform administration and
     * seller support services, ensuring proper communication channels for
     * business operations.
     */
    contact_person: string;

    /**
     * Business contact phone number for order processing, customer support,
     * and business communications. Used for urgent notifications and
     * verification purposes.
     *
     * The phone number supports order fulfillment coordination, customer
     * service interactions, and business verification workflows. It
     * provides an alternative communication channel for time-sensitive
     * matters.
     *
     * Phone number validation ensures proper formatting and supports
     * international business operations with standardized contact
     * information.
     */
    phone_number: string;

    /**
     * Registered business address for verification, correspondence, and
     * compliance purposes. This represents the official business location
     * for legal and operational requirements.
     *
     * The business address is used for tax documentation, shipping
     * coordination, and business verification processes. It supports
     * compliance with regional business regulations and platform
     * standards.
     *
     * Address validation ensures completeness and supports proper business
     * verification workflows required for seller account activation.
     */
    business_address: string;

    /**
     * Business tax identification number for financial reporting,
     * compliance, and verification purposes. Optional field that enhances
     * business authenticity when provided.
     *
     * The tax ID supports financial reporting requirements, business
     * verification processes, and compliance with tax regulations. It
     * provides additional validation for business authenticity and
     * regulatory compliance.
     *
     * When provided, the tax ID enhances seller credibility and supports
     * proper financial reporting for platform transactions and revenue
     * management.
     */
    tax_id?: string | undefined;

    /**
     * Client IP address for session tracking and security monitoring. This
     * field is optional as the server can extract it from the request
     * headers.
     *
     * The IP address is recorded in the shopping_mall_seller_sessions table
     * for audit purposes and security analysis. It helps track seller
     * connection patterns and detect suspicious activity across different
     * login sessions.
     *
     * When provided by the client, it supplements server-side IP detection
     * and can be useful for server-side rendering scenarios where client IP
     * information is available.
     */
    ip?: string | undefined;

    /**
     * Connection URL where the seller session is being established. This
     * represents the current page URL where registration is occurring.
     *
     * The href value is stored in the shopping_mall_seller_sessions table
     * for session context tracking. It helps identify the specific
     * application entry point and provides context for seller navigation
     * patterns.
     *
     * This field is mandatory as it provides essential context for session
     * management and security monitoring that cannot be reliably inferred
     * server-side.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that directed the seller to the registration endpoint.
     * This indicates the previous page or source that led to the
     * registration attempt.
     *
     * The referrer information is recorded in shopping_mall_seller_sessions
     * for security analysis and seller journey tracking. It helps
     * understand seller navigation flows and detect potential phishing or
     * suspicious referral patterns.
     *
     * This field is required as it provides valuable context for security
     * monitoring and seller experience analysis that enhances session
     * management.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Seller login credentials for authentication with comprehensive security
   * context.
   *
   * Contains the email and password combination used to authenticate seller
   * accounts, along with session tracking information for enhanced security
   * monitoring. The operation validates credentials against stored hashed
   * passwords using bcrypt comparison and checks seller account status before
   * granting access.
   *
   * Security features include rate limiting to prevent brute force attacks,
   * IP address tracking for suspicious activity detection, and device
   * information monitoring for unauthorized access prevention. The system
   * validates account status, allowing login only for 'active' or 'verified'
   * accounts while blocking 'suspended' or 'pending_approval' accounts.
   *
   * Session context fields (href, referrer, and device) are essential for
   * audit trails, security monitoring, and providing comprehensive
   * authentication context across the seller management platform.
   */
  export type ILogin = {
    /**
     * Seller email address used for authentication and account
     * identification. Must be a valid email format and match the registered
     * seller account. The system validates the email against the seller
     * database and checks account status before proceeding with
     * authentication.
     *
     * Email validation includes format verification, domain checking, and
     * account existence confirmation. Invalid or non-existent emails will
     * result in authentication failure to prevent unauthorized access
     * attempts.
     */
    email: string & tags.Format<"email">;

    /**
     * Seller password for authentication verification. Must meet the
     * platform's security requirements including minimum length, character
     * complexity, and encryption standards. The password is hashed using
     * bcrypt algorithm before comparison with stored credentials.
     *
     * Password validation includes strength checking and comparison against
     * the stored hash. Failed authentication attempts are logged and
     * subject to rate limiting to prevent brute force attacks.
     */
    password: string;

    /**
     * Client IP address for session tracking and security monitoring. This
     * field is optional as the server can extract the IP address from the
     * request headers, but clients may provide it for server-side rendering
     * scenarios or enhanced audit trails.
     *
     * The IP address is used for geolocation tracking, suspicious activity
     * detection, and session management across different locations.
     */
    ip?: string | undefined;

    /**
     * Connection URL representing the current page or application location.
     * This MANDATORY field provides context for the authentication request
     * and is used for audit trails, security monitoring, and session
     * management.
     *
     * The href field helps track authentication source and provides
     * valuable debugging information for support scenarios.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating the previous page or application that
     * initiated the authentication request. This MANDATORY field is
     * essential for understanding user navigation flow and detecting
     * potential security threats.
     *
     * Referrer information assists in identifying suspicious authentication
     * patterns and provides context for user behavior analysis.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client device information for enhanced security tracking and session
     * management. Includes device type, operating system, browser
     * information, or application identifier to provide comprehensive
     * authentication context.
     *
     * Device tracking helps detect suspicious login patterns, supports
     * multi-device session management, and enhances security by monitoring
     * authentication from unfamiliar devices.
     */
    device?: string | undefined;
  };

  /**
   * Refresh token request for extending seller authentication session
   * validity.
   *
   * Used to extend seller session continuity by generating new access tokens
   * without requiring re-authentication. The refresh mechanism maintains
   * seller dashboard access while enhancing security through periodic token
   * rotation and validation checks.
   *
   * Security measures include refresh token expiration policies, automatic
   * session termination for suspended accounts, and validation of token
   * authenticity against the original authentication context. The operation
   * supports seamless seller experience by minimizing authentication
   * interruptions during extended management sessions while maintaining
   * robust security protocols.
   *
   * Successful token refresh provides sellers with new access tokens while
   * preserving their current session context, permissions, and security
   * settings across the seller management platform.
   */
  export type IRefresh = {
    /**
     * Refresh token for authentication token renewal and session
     * continuity. This token must be valid, unexpired, and associated with
     * an active seller account. The system validates the token's
     * authenticity and checks for potential security compromises before
     * issuing new access tokens.
     *
     * Refresh tokens follow strict security protocols including encryption,
     * expiration policies, and automatic revocation for suspicious
     * activity. Token validation includes signature verification,
     * expiration checking, and association with valid seller sessions.
     */
    refresh_token: string;

    /**
     * Client user agent string for enhanced token security validation.
     * Provides information about the client application, browser, or device
     * making the refresh request. This field helps detect token misuse
     * across different clients and enhances security by validating request
     * context.
     *
     * User agent validation supports security monitoring by detecting
     * anomalies in token usage patterns and preventing unauthorized access
     * from unfamiliar clients.
     */
    user_agent?: string | undefined;
  };

  /**
   * Seller authentication response with comprehensive account information and
   * authorization tokens.
   *
   * Provides successful authentication results including complete seller
   * identity details, business information, and token-based authorization for
   * accessing seller-specific platform features. This response is returned
   * after successful login, registration, or token refresh operations.
   *
   * The response includes both short-lived access tokens for immediate API
   * authorization and long-lived refresh tokens for session management
   * continuity. Seller account status information ensures appropriate feature
   * access based on verification and compliance status.
   *
   * Security considerations include token expiration management, session
   * tracking, and business verification status validation. The comprehensive
   * response enables seamless seller dashboard access while maintaining
   * platform security standards.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the authenticated seller account. Generated
     * automatically upon registration using UUID v4 format. Serves as the
     * primary key for seller identification across the platform.
     *
     * Used for referencing seller accounts in product listings, order
     * processing, and administrative functions. The UUID format ensures
     * global uniqueness and prevents collision across distributed systems.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Seller email address used for authentication, business communication,
     * and platform notifications. Must be unique across all seller accounts
     * in the system.
     *
     * Validated against RFC 5322 email format standards and used as the
     * primary contact method for order notifications, platform updates, and
     * business correspondence. Email verification is required before full
     * platform access is granted.
     */
    email: string & tags.Format<"email">;

    /**
     * Legal business name of the seller entity for identification,
     * verification, and customer-facing display. Must be unique across all
     * registered sellers on the platform.
     *
     * Used in product listings, order receipts, and business verification
     * processes. The business name appears to customers during shopping and
     * represents the seller's brand identity throughout the marketplace.
     */
    business_name: string;

    /**
     * Primary contact person responsible for seller account management,
     * order processing, and business communications. Typically the business
     * owner or designated account manager.
     *
     * Used for administrative correspondence, support interactions, and
     * verification processes. The contact person serves as the main point
     * of contact for platform administrators and customer support
     * escalations.
     */
    contact_person: string;

    /**
     * Business contact phone number for order processing, support
     * communications, and verification purposes. Must follow international
     * phone number formatting standards.
     *
     * Used for urgent order notifications, verification calls, and business
     * support communications. The phone number is verified during the
     * seller onboarding process to ensure business authenticity.
     */
    phone_number: string;

    /**
     * Registered business address for verification, correspondence, and
     * legal compliance purposes. Must be a complete physical address
     * including street, city, state/province, and postal code.
     *
     * Used for business verification, tax documentation, and
     * shipping-related communications. The address must match official
     * business registration records for compliance and authenticity
     * verification.
     */
    business_address: string;

    /**
     * Seller account status indicating the current operational state. Valid
     * values include: 'active' (fully operational), 'suspended'
     * (temporarily blocked), 'pending_approval' (awaiting verification), or
     * 'verified' (approved and active).
     *
     * Determines seller access to platform features and visibility to
     * customers. Status transitions are managed through administrative
     * processes and business verification workflows.
     */
    status: string;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Compact seller representation optimized for list views, search results,
   * and relationship references.
   *
   * Provides essential seller identification information while maintaining
   * performance efficiency in high-volume display scenarios. The summary
   * format excludes sensitive authentication fields and detailed business
   * information to prevent data exposure in public contexts.
   *
   * Used extensively in administrative interfaces for seller management,
   * product catalog references where seller context is needed, and platform
   * navigation systems requiring seller identification without full details.
   * Security measures ensure that sensitive information like password_hash
   * and tax details are never exposed in summary views.
   *
   * The summary maintains business identification integrity while protecting
   * account security through selective field inclusion. This balance enables
   * efficient platform operations without compromising seller privacy or
   * security standards.
   */
  export type ISummary = {
    /**
     * Unique seller identifier for reliable reference and relationship
     * mapping. Generated using UUID v4 format to ensure global uniqueness
     * across distributed systems.
     *
     * Used as the primary key for seller identification in list views,
     * search results, and relationship references. The UUID format prevents
     * collision and enables reliable cross-referencing across platform
     * components.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Seller business name for quick identification and brand recognition
     * in list displays. Represents the legal business entity registered on
     * the platform.
     *
     * Enables efficient seller identification in administrative interfaces,
     * product catalog references, and customer-facing contexts where seller
     * identity needs to be displayed concisely.
     */
    business_name: string;

    /**
     * Primary contact person for business communications and administrative
     * reference. Provides human-readable identification for seller
     * accounts.
     *
     * Used in administrative interfaces for quick reference and
     * communication purposes. The contact person field helps platform
     * administrators identify the appropriate business representative for
     * follow-up actions.
     */
    contact_person: string;

    /**
     * Seller email address for identification and limited communication
     * contexts. Provides essential contact information while maintaining
     * security boundaries.
     *
     * Used in administrative interfaces where email communication may be
     * required, but access is restricted to authorized personnel only. The
     * email field enables efficient seller identification and communication
     * routing.
     */
    email: string & tags.Format<"email">;

    /**
     * Seller account status for quick status assessment in list views.
     * Indicates operational state without exposing detailed verification
     * information.
     *
     * Enables administrative filtering and status-based actions while
     * maintaining appropriate information boundaries. Status values help
     * prioritize administrative actions and identify accounts needing
     * attention.
     */
    status: string;
  };
}
